import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { drivers, staff } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Where a signed-in identity with no explicit destination should land —
 * the one authoritative landing decision for the whole app. Originally
 * lived only in src/app/auth/callback/route.ts (added 2026-09-01,
 * lifecycle audit issue #9); moved here 2026-09-08 (Priority 2 of the
 * master implementation directive) once /sign-in's own already-signed-in
 * redirect turned out to hardcode "/home" instead of calling it — a
 * second, disagreeing landing decision for the exact same moment,
 * which is exactly the duplication this priority exists to close.
 * Both call sites now share this one implementation; a third can't
 * silently drift from it the way /sign-in did.
 *
 * Driver takes priority over staff (mobile-first, single-purpose
 * panel); either can still reach the customer Home via their sidebar's
 * "My Account" link. Filters on isActive (2026-09-08) — see this
 * file's own git history/the driver check below for why a disabled
 * row must not still win this priority order.
 */
export async function defaultLandingFor(authUserId: string): Promise<string> {
  const db = getDb();
  const [driverRow] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(and(eq(drivers.authUserId, authUserId), eq(drivers.isActive, true)));
  if (driverRow) return "/internal/driver";

  const [staffRow] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.authUserId, authUserId));
  if (staffRow) return "/internal/dispatch";

  return "/home";
}

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

/**
 * Cheap existence check, not a gate. Originally used by the customer
 * account sidebar to show a "Staff Dashboard" link when applicable;
 * that link moved when Sign Out/account controls consolidated into
 * the header (2026-09-07, see PanelSidebar.tsx) and AccountSidebar
 * dropped this along with it — discovering /internal/dispatch now
 * happens via /auth/callback's defaultLandingFor, which sends a
 * staff/super_admin identity there automatically on a plain sign-in.
 * Currently unused, kept for the next thing that needs a plain
 * "is this identity staff" check without the redirect/404 a full
 * requireStaff() call would do.
 */
export async function isActiveStaffMember(authUserId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.authUserId, authUserId), eq(staff.isActive, true)));
  return rows.length > 0;
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
