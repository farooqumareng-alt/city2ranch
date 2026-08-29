import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { drivers, staff } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Gates a staff-only (dispatch) page/action. Signed-out -> /sign-in
 * (nothing to hide, just needs identity). Signed-in but not staff, or a
 * disabled staff row -> 404, not a redirect — a random customer (or a
 * deactivated ex-staff member) hitting this route shouldn't get a page
 * that confirms the route exists or distinguishes "not staff" from
 * "staff, but disabled."
 *
 * Every action, not just the page-level layout, must call this itself —
 * the layout gate alone is never the real enforcement boundary.
 */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.authUserId, user.id));

  const staffMember = rows[0];
  if (!staffMember || !staffMember.isActive) notFound();
  // email is included (not just the staff row's own columns) so callers
  // that need "who is this" — the panel sidebar's "Signed in as" line, in
  // particular — don't have to make a second getCurrentUser() call.
  return { ...staffMember, email: user.email };
}

/** Gates the team-management admin panel (/internal/dispatch/admin) and
 *  its actions — see src/lib/actions/team-management.ts. Requires
 *  requireStaff() to pass first, so a disabled or non-staff account
 *  404s at that step, identically to how it fails everywhere else
 *  under /internal/dispatch — the failure here is never distinguishable
 *  from "not staff at all." */
export async function requireSuperAdmin() {
  const staffMember = await requireStaff();
  if (staffMember.role !== "super_admin") notFound();
  return staffMember;
}

/** Same shape as requireStaff(), for the driver-gated view. */
export async function requireDriver() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const rows = await db
    .select()
    .from(drivers)
    .where(eq(drivers.authUserId, user.id));

  const driver = rows[0];
  // drivers.isActive has existed since this table was created but was
  // never actually checked here until now — a disabled driver kept
  // full access. Fixed alongside the new staff-disabling capability,
  // since building "disable an account" without this check would mean
  // the toggle silently does nothing for drivers.
  if (!driver || !driver.isActive) notFound();
  return { ...driver, email: user.email };
}
