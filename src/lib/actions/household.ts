"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { householdMembers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getResend } from "@/lib/email/resend";
import { householdInviteEmail } from "@/lib/email/templates";
import { householdInviteSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

/**
 * True if this user is currently an active member of someone else's
 * household. Enforced in both directions (see below) so the model stays
 * flat — a person is either an independent owner or a delegated member
 * of exactly one owner, never both, never chained.
 */
async function isActiveMemberElsewhere(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.memberAuthUserId, userId), eq(householdMembers.status, "active")));
  return rows.length > 0;
}

async function ownsAnyMembers(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(eq(householdMembers.ownerAuthUserId, userId), or(eq(householdMembers.status, "invited"), eq(householdMembers.status, "active")))
    );
  return rows.length > 0;
}

export async function inviteHouseholdMember(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, message: "Please sign in." };

  const parsed = householdInviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, ["email"]),
    };
  }

  const inviteEmail = parsed.data.email.trim().toLowerCase();
  if (inviteEmail === user.email.toLowerCase()) {
    return { ok: false, message: "You can't invite yourself." };
  }

  if (await isActiveMemberElsewhere(user.id)) {
    return {
      ok: false,
      message: "You're currently a member of another household — leave it before inviting anyone.",
    };
  }

  const db = getDb();
  try {
    await db.insert(householdMembers).values({
      ownerAuthUserId: user.id,
      memberEmail: inviteEmail,
      status: "invited",
    });
  } catch (error) {
    console.error("[inviteHouseholdMember] failed", error);
    return { ok: false, message: "That person may already be invited." };
  }

  // Non-blocking, matching every other transactional email in this app
  // (e.g. quoteReadyEmail) — a failed notification email never breaks
  // the invite itself; the invited person can still find it once they
  // sign in and visit /household.
  try {
    const resend = getResend();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { subject, html } = householdInviteEmail({
      ownerEmail: user.email,
      signInUrl: `${siteUrl}/sign-in?next=${encodeURIComponent("/household")}`,
    });
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: inviteEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("[inviteHouseholdMember] notification email failed", error);
  }

  revalidatePath("/household");
  return { ok: true };
}

/** Accept only succeeds for the exact invited email, signed in — proof
 *  of inbox control via magic-link is what makes this safe to grant
 *  full delegated access on. */
export async function acceptHouseholdInvite(inviteId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;

  if (await ownsAnyMembers(user.id)) {
    // Can't become a member while you're an owner yourself — keeps the
    // model flat, no chains. The UI hides this case, but the action
    // re-checks it regardless (never trust the UI alone).
    return;
  }

  const db = getDb();
  await db
    .update(householdMembers)
    .set({ status: "active", memberAuthUserId: user.id, acceptedAt: new Date() })
    .where(
      and(
        eq(householdMembers.id, inviteId),
        eq(householdMembers.status, "invited"),
        sql`lower(${householdMembers.memberEmail}) = lower(${user.email})`
      )
    );

  revalidatePath("/household");
}

export async function declineHouseholdInvite(inviteId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;

  const db = getDb();
  await db
    .update(householdMembers)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(
      and(
        eq(householdMembers.id, inviteId),
        sql`lower(${householdMembers.memberEmail}) = lower(${user.email})`
      )
    );

  revalidatePath("/household");
}

/** Owner cutting off a member's access — immediate, since
 *  getEffectiveOwnerId only ever resolves through status = 'active'. */
export async function revokeHouseholdMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const db = getDb();
  await db
    .update(householdMembers)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.ownerAuthUserId, user.id)));

  revalidatePath("/household");
}

/** A member voluntarily leaving — same effect as revoke, self-initiated. */
export async function leaveHousehold(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const db = getDb();
  await db
    .update(householdMembers)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.memberAuthUserId, user.id)));

  revalidatePath("/household");
}
