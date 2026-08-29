import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerProfiles } from "@/lib/db/schema";

/**
 * Used by (account)/layout.tsx (for the sidebar's display name) and
 * independently again by /profile and /orders/new for their own data.
 * Deliberately its own plain module, not part of
 * src/lib/actions/update-profile.ts — that file is a "use server"
 * action boundary, and wrapping an export there in React's cache()
 * risks Next's "use server" export-shape checks not recognizing it as
 * a plain async function. This is a read-only query, not a mutation,
 * so it doesn't need to be a server action at all.
 *
 * cache() scopes the memoization to the current request — see the
 * near-identical reasoning on getEffectiveOwnerId in
 * src/lib/household.ts — so the layout's call and the page's call
 * share one DB round trip instead of two.
 *
 * Returns null for a signed-in customer with no saved profile yet — a
 * normal state.
 */
export const getOwnProfile = cache(async (authUserId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.authUserId, authUserId));
  return rows[0] ?? null;
});
