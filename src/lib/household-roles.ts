/**
 * What a household member's role permits — see the `role` column's
 * comment in src/lib/db/schema.ts. Deliberately its own DB-free module
 * (like src/lib/orders/status.ts) so this pure logic can be unit tested
 * without pulling in @/lib/db — vitest has no path-alias resolution
 * configured, unlike the Next.js build.
 */
export type HouseholdRole = "full" | "ordering" | "view_only";
export type HouseholdAction = "pay" | "place_order" | "manage_places";

const ROLE_ACTIONS: Record<HouseholdRole, ReadonlySet<HouseholdAction>> = {
  full: new Set(["pay", "place_order", "manage_places"]),
  ordering: new Set(["place_order", "manage_places"]),
  view_only: new Set(),
};

export function canPerform(role: HouseholdRole, action: HouseholdAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}
