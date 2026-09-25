"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { driverMessages, drivers, staff } from "@/lib/db/schema";
import { isActiveStaffMember } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { getResend } from "@/lib/email/resend";
import { driverMessageEmail } from "@/lib/email/templates";

/**
 * Mirrors order-messages.ts's postOrderMessage — one action shared by
 * both sides of the thread (staff on the Drivers table's Message page,
 * the driver on their own Inbox tab), since the ownership check is the
 * only real difference and it's cheap to do both checks here.
 */
export async function postDriverMessage(driverId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const db = getDb();

  const staffRows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.authUserId, user.id), eq(staff.isActive, true)));
  const isStaff = staffRows.length > 0;

  if (!isStaff) {
    // A driver may only post to their own thread — never trust the
    // driverId argument alone, same discipline as every other action in
    // this app.
    const driverRows = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.authUserId, user.id));
    if (driverRows[0]?.id !== driverId) return;
  }

  await db.insert(driverMessages).values({
    driverId,
    authorType: isStaff ? "staff" : "driver",
    authorId: user.id,
    body,
  });

  revalidatePath(`/internal/dispatch/admin/drivers/${driverId}/messages`);
  revalidatePath("/internal/driver/inbox");

  // Best-effort, never blocks the send — same pattern assignDriver.ts
  // already uses for driverJobOfferedEmail. Only fires for a staff->driver
  // message; a driver's own reply doesn't need to email the whole staff
  // team.
  if (isStaff) {
    try {
      const [driverRow] = await db
        .select({
          name: drivers.name,
          email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${drivers.authUserId})`,
        })
        .from(drivers)
        .where(eq(drivers.id, driverId));
      if (driverRow?.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const resend = getResend();
        const { subject, html } = driverMessageEmail({
          driverName: driverRow.name,
          body,
          inboxUrl: `${siteUrl}/internal/driver/inbox`,
        });
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
          to: driverRow.email,
          subject,
          html,
        });
      }
    } catch (error) {
      console.error("[postDriverMessage] driver notification email failed", error);
    }
  }
}

/**
 * Used by both the staff-side and driver-side thread pages. Staff can
 * view any driver's thread (matches getDriverDetail()'s own requireStaff()
 * widening, 2026-09-18); a driver may only view their own — checked here,
 * not left to the page, same discipline as postDriverMessage above.
 *
 * Uses isActiveStaffMember(), not requireStaff() — this needs a plain
 * boolean since a driver calling this is a normal, expected case, not an
 * authorization failure; requireStaff() would redirect()/notFound() a
 * driver right out of their own inbox. Exactly the "next thing" that
 * helper's own doc comment already anticipated.
 */
export async function listDriverMessages(driverId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = getDb();

  const isStaff = await isActiveStaffMember(user.id);
  if (!isStaff) {
    const driverRows = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.authUserId, user.id));
    if (driverRows[0]?.id !== driverId) return [];
  }

  return db
    .select()
    .from(driverMessages)
    .where(eq(driverMessages.driverId, driverId))
    .orderBy(driverMessages.createdAt);
}

/** Marks every message in a driver's own thread read — called when they open their Inbox tab. */
export async function markDriverMessagesRead(driverId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const db = getDb();
  const driverRows = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.authUserId, user.id));
  if (driverRows[0]?.id !== driverId) return;

  await db
    .update(driverMessages)
    .set({ readAt: new Date() })
    .where(and(eq(driverMessages.driverId, driverId), eq(driverMessages.authorType, "staff")));
}
