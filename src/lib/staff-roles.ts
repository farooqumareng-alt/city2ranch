/**
 * What a staff role permits — see the `role` column's comment in
 * src/lib/db/schema.ts. Deliberately its own DB-free module (like
 * src/lib/household-roles.ts and src/lib/orders/status.ts) so this
 * pure logic can be unit tested without vitest needing @/lib/db's
 * path-alias resolution, which isn't configured.
 *
 * "manager" added 2026-09-11 — splits "operate" from "configure" per
 * the master implementation directive's own Priority 8 rule: day-to-
 * day dispatch work (Work Queue, orders) stays plain requireStaff(),
 * unchanged; business configuration (Stores, Pricing, ZIP Coverage,
 * Grocery Items, Settings) now needs "configure_business", which only
 * a manager or super_admin has. A super_admin can always do everything
 * a manager can — see canPerform()'s own comment on why that's
 * expressed as a superset, not duplicated per-action.
 */
export type StaffRole = "staff" | "manager" | "super_admin";
export type StaffAction = "manage_team" | "configure_business";

const ROLE_ACTIONS: Record<StaffRole, ReadonlySet<StaffAction>> = {
  staff: new Set([]),
  manager: new Set(["configure_business"]),
  // Every action super_admin can do is listed explicitly, same as the
  // other two rows — a new StaffAction needs adding here too if a
  // super_admin should be able to do it, there's no automatic "super
  // admin gets everything" shortcut to keep in sync with by itself.
  super_admin: new Set<StaffAction>(["manage_team", "configure_business"]),
};

export function canPerform(role: StaffRole, action: StaffAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}
