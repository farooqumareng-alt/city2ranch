import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultLandingFor } from "@/lib/auth/roles";

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
