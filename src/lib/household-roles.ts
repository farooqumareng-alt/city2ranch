/**
 * What a household member's role permits — see the `role` column's
 * comment in src/lib/db/schema.ts. Deliberately its own DB-free module
 * (like src/lib/orders/status.ts) so this pure logic can be unit tested
 * fast, without a live database — vitest.config.ts gives @/ imports
 * real path-alias resolution now, so this split is a speed/clarity
 * choice, not a workaround for a tooling gap.
 */
export type HouseholdRole = "full" | "ordering" | "view_only";
export type HouseholdAction =
  | "pay"
  | "place_order"
  | "manage_places"
  // Added in the security remediation pass (2026-08-30): six actions
  // (shopping lists, profile, notification preferences, order
  // messages, claiming an unclaimed order) resolved the household
  // owner and wrote to their data with no role check at all, so
  // "view_only" didn't actually mean view-only. Grouped at the same
  // tier as their closest existing precedent rather than inventing new
  // tiers — see each action's own call site for the reasoning.
  | "manage_lists"
  | "manage_profile"
  | "manage_notifications"
  | "message";

const ROLE_ACTIONS: Record<HouseholdRole, ReadonlySet<HouseholdAction>> = {
  full: new Set([
    "pay",
    "place_order",
    "manage_places",
    "manage_lists",
    "manage_profile",
    "manage_notifications",
    "message",
  ]),
  ordering: new Set(["place_order", "manage_places", "manage_lists", "manage_profile", "message"]),
  view_only: new Set(),
};

export function canPerform(role: HouseholdRole, action: HouseholdAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}
