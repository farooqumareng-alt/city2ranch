import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { drivers, staff } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Gates a staff-only (dispatch) page/action. Signed-out -> /sign-in
 * (nothing to hide, just needs identity). Signed-in but not staff ->
 * 404, not a redirect — a random customer hitting this route shouldn't
 * get a page that confirms the route exists.
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

  if (rows.length === 0) notFound();
  // email is included (not just the staff row's own columns) so callers
  // that need "who is this" — the panel sidebar's "Signed in as" line, in
  // particular — don't have to make a second getCurrentUser() call.
  return { ...rows[0], email: user.email };
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

  if (rows.length === 0) notFound();
  return { ...rows[0], email: user.email };
}
