import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { drivers, staff } from "@/lib/db/schema";

/**
 * Where a signed-in identity with no explicit `next` lands by default —
 * added 2026-09-01 (lifecycle audit issue #9's felt experience). Staff
 * and drivers already don't need a separate "customer account" in the
 * authorization code (requireStaff()/requireDriver() check only their
 * own table), but every identity's plain sign-in used to land on the
 * ordinary customer Home regardless, with no distinct onboarding path —
 * which is what actually read as "staff needs a customer account,"
 * even though nothing enforced it. Driver takes priority over staff
 * (mobile-first, single-purpose panel); either can still reach the
 * customer Home via their sidebar's "My Account" link.
 */
async function defaultLandingFor(authUserId: string): Promise<string> {
  const db = getDb();
  const [driverRow] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.authUserId, authUserId));
  if (driverRow) return "/internal/driver";

  const [staffRow] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(eq(staff.authUserId, authUserId));
  if (staffRow) return "/internal/dispatch";

  return "/home";
}

/** Exchanges the magic-link code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Only ever redirect to a path on this same site. No payload was
  // found in practice that turns this into a cross-origin redirect
  // (Next.js/the browser normalize "//evil.com" and "https://evil.com"
  // back onto this origin when concatenated after it), but validating
  // explicitly makes that a guarantee rather than an accident of how
  // URL parsing happens to behave today.
  const requestedNext = searchParams.get("next");
  const hasExplicitNext =
    Boolean(requestedNext) && requestedNext!.startsWith("/") && !requestedNext!.startsWith("//");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // isActive isn't checked here — a disabled staff/driver still
      // correctly lands on their panel and gets a clean 404 from
      // requireStaff()/requireDriver() there, same as anywhere else in
      // the app; this is just picking a landing page, not a security
      // boundary of its own.
      const next = hasExplicitNext ? requestedNext! : await defaultLandingFor(data.user.id);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
