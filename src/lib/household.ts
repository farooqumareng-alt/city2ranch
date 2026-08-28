import { cache } from "react";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { householdMembers } from "@/lib/db/schema";

// Reaches auth.users.email via a raw correlated subquery rather than a
// Drizzle-managed join — schema.ts's authUsers shadow table intentionally
// only declares `id` (see its comment: exporting more columns there
// would make `drizzle-kit generate` think it owns Supabase's real
// auth.users table). This is read-only, never used to write.
function ownerEmailSubquery(ownerIdColumn: typeof householdMembers.ownerAuthUserId) {
  return sql<string | null>`(SELECT email FROM auth.users WHERE id = ${ownerIdColumn})`;
}

/**
 * Resolves which auth_user_id a signed-in user's orders/places/profile
 * should actually be read from and written to. For almost everyone this
 * is just their own id. For an active household member (full
 * delegation — see src/lib/actions/household.ts), it's the owner's id
 * instead, so a member genuinely shares one account with the owner
 * rather than keeping a separate parallel set of orders/places.
 *
 * This is the single choke point every account-scoped query/action must
 * call instead of using the signed-in user's id directly — see
 * submit-order.ts, approve-and-pay.ts, places.ts, update-profile.ts,
 * and the (account) pages for orders/places/profile.
 *
 * Wrapped in React's cache() — (account)/layout.tsx resolves this once
 * for the sidebar/profile, then the page underneath resolves it again
 * for its own data. Both calls are real, deliberate (never trust the
 * layout alone), but without cache() they were also two separate round
 * trips to the DB pool for the exact same query on every page view.
 * cache() scopes the memoization to this one request, so the repeat
 * call becomes free instead of a second hop through the pooler.
 */
export const getEffectiveOwnerId = cache(async (userId: string): Promise<string> => {
  const db = getDb();
  const rows = await db
    .select({ ownerAuthUserId: householdMembers.ownerAuthUserId })
    .from(householdMembers)
    .where(and(eq(householdMembers.memberAuthUserId, userId), eq(householdMembers.status, "active")));
  return rows[0]?.ownerAuthUserId ?? userId;
});

/** Same resolution as getEffectiveOwnerId, but also returns the owner's
 *  email — for the one call site (submitOrder) that needs to stamp a
 *  new order's customer_email with whoever the order actually belongs
 *  to, not whichever household member happened to submit it. Avoids a
 *  second round trip for the common (non-delegated) case. Also
 *  cache()'d, same reasoning as getEffectiveOwnerId above. */
export const getEffectiveOwner = cache(async (
  userId: string,
  userEmail: string
): Promise<{ id: string; email: string }> => {
  const db = getDb();
  const rows = await db
    .select({
      ownerAuthUserId: householdMembers.ownerAuthUserId,
      ownerEmail: ownerEmailSubquery(householdMembers.ownerAuthUserId),
    })
    .from(householdMembers)
    .where(and(eq(householdMembers.memberAuthUserId, userId), eq(householdMembers.status, "active")));

  const owner = rows[0];
  if (!owner) return { id: userId, email: userEmail };
  return { id: owner.ownerAuthUserId, email: owner.ownerEmail ?? userEmail };
});

/** Everything the /household page needs to render whichever of the
 *  three states (independent owner, active member elsewhere, pending
 *  invite) applies to the signed-in user. */
export async function getHouseholdData(userId: string, email: string) {
  const db = getDb();

  const [ownedMembers, pendingInvites, activeMembership] = await Promise.all([
    db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.ownerAuthUserId, userId), sql`${householdMembers.status} != 'revoked'`))
      .orderBy(asc(householdMembers.invitedAt)),
    db
      .select({
        id: householdMembers.id,
        invitedAt: householdMembers.invitedAt,
        ownerEmail: ownerEmailSubquery(householdMembers.ownerAuthUserId),
      })
      .from(householdMembers)
      .where(and(eq(householdMembers.status, "invited"), sql`lower(${householdMembers.memberEmail}) = lower(${email})`)),
    db
      .select({
        id: householdMembers.id,
        ownerAuthUserId: householdMembers.ownerAuthUserId,
        acceptedAt: householdMembers.acceptedAt,
        ownerEmail: ownerEmailSubquery(householdMembers.ownerAuthUserId),
      })
      .from(householdMembers)
      .where(and(eq(householdMembers.memberAuthUserId, userId), eq(householdMembers.status, "active"))),
  ]);

  return {
    ownedMembers,
    pendingInvites,
    activeMembership: activeMembership[0] ?? null,
  };
}
