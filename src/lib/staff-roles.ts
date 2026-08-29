/**
 * What a staff role permits — see the `role` column's comment in
 * src/lib/db/schema.ts. Deliberately its own DB-free module (like
 * src/lib/household-roles.ts and src/lib/orders/status.ts) so this
 * pure logic can be unit tested without vitest needing @/lib/db's
 * path-alias resolution, which isn't configured.
 */
export type StaffRole = "staff" | "super_admin";
export type StaffAction = "manage_team";

const ROLE_ACTIONS: Record<StaffRole, ReadonlySet<StaffAction>> = {
  staff: new Set([]),
  super_admin: new Set(["manage_team"]),
};

export function canPerform(role: StaffRole, action: StaffAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}
