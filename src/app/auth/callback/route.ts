import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/home";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
