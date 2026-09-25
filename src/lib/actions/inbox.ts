"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { serviceAreaLeads, foundingMembers, contactMessages } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { looksLikeSpam } from "@/lib/inbox-spam";
import type { ActionResult } from "@/lib/actions/types";
import type { InboxSource, InboxEntry } from "@/lib/inbox-types";

const LIST_PATH = "/internal/dispatch/inbox";

/**
 * Every guest-facing signup/message City2Ranch receives outside the
 * real order pipeline, in one place — 2026-09-16, closing a real gap
 * found live: three separate forms (Service Area waitlist, Founding
 * Member, Contact/Support) each only ever notified staff by email, with
 * no persistent, searchable admin view. A missed or deleted email meant
 * that lead was gone from the business's view entirely. Named "Inbox",
 * not "Leads" — the Operations Center's own "New Leads" tile already
 * means something specific and different (unconverted service_requests,
 * Work Queue's needs_quote bucket); reusing that word here would blur
 * two genuinely different concepts.
 *
 * Deliberately three separate queries merged in application code, not
 * a SQL UNION — the three tables have different columns and no shared
 * key, and there's no meaningful performance concern at this volume.
 */
export async function listInboxEntries(): Promise<InboxEntry[]> {
  await requireStaff();
  const db = getDb();

  const [waitlist, founders, contacts] = await Promise.all([
    db.select().from(serviceAreaLeads).orderBy(desc(serviceAreaLeads.createdAt)),
    db.select().from(foundingMembers).orderBy(desc(foundingMembers.createdAt)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
  ]);

  const entries: Omit<InboxEntry, "isLikelySpam">[] = [
    ...waitlist.map((row) => ({
      id: row.id,
      source: "waitlist" as const,
      createdAt: row.createdAt,
      name: row.name,
      email: row.email,
      phone: row.phone,
      context: `${row.city}, ${row.zip} · ${row.preferredFrequency}`,
      message: null,
      status: row.status,
    })),
    ...founders.map((row) => ({
      id: row.id,
      source: "founding_member" as const,
      createdAt: row.createdAt,
      name: row.name,
      email: row.email,
      phone: row.phone,
      context: `${row.propertyLocation} (${row.zip}) · ${row.shoppingFrequency}`,
      message: [row.servicesNeeded, row.preferredStores, row.preferredDays].filter(Boolean).join(" · ") || null,
      status: row.status,
    })),
    ...contacts.map((row) => ({
      id: row.id,
      source: "contact" as const,
      createdAt: row.createdAt,
      name: row.name,
      email: row.email,
      phone: row.phone,
      context: row.subject,
      message: row.message,
      status: row.status,
    })),
  ];

  entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return entries.map((entry) => ({ ...entry, isLikelySpam: looksLikeSpam(entry) }));
}

/** Bound as `setInboxEntryStatus.bind(null, source, id)`. Each source
 *  maps to its own real table — there's no shared "leads" table to
 *  write to, so the source has to travel with the id to know which one. */
export async function setInboxEntryStatus(
  source: InboxSource,
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const statusValue = formData.get("status");
  const status =
    statusValue === "contacted" || statusValue === "converted" || statusValue === "closed"
      ? statusValue
      : "new";

  const table =
    source === "waitlist" ? serviceAreaLeads : source === "founding_member" ? foundingMembers : contactMessages;

  try {
    const db = getDb();
    await db.update(table).set({ status }).where(eq(table.id, id));
  } catch (error) {
    console.error("[setInboxEntryStatus] failed", error);
    return { ok: false, message: "We couldn't update this right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
