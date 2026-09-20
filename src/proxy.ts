import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { withTimeout } from "@/lib/timeout";

// 2026-09-20 incident: this runs on every request site-wide, and used
// to call Supabase's auth.getUser() with no timeout — see
// withTimeout()'s own doc comment for the failure mode this guards
// against (a hung auth check here hung literally every page).
const AUTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Refreshes the Supabase auth session cookie on every request.
 *
 * Named `proxy` (not `middleware`) — Next.js 16 renamed the file
 * convention; `middleware.ts`/`export function middleware` is deprecated.
 * Every Supabase SSR guide predating Next 16 says "middleware.ts" — this
 * is the translated version.
 *
 * `src/lib/supabase/server.ts`'s `setAll` can't write cookies from a
 * Server Component render, so without this running on every request,
 * sessions would silently stop refreshing and users would get logged out
 * unpredictably.
 */
export async function proxy(request: NextRequest) {
  // Exposes the current pathname to Server Components via headers() —
  // used by src/app/orders/layout.tsx to send a signed-out visitor back
  // to the exact page they wanted (e.g. /orders/new) after sign-in,
  // instead of always dropping them on the generic /orders list.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const nextInit = { request: { headers: requestHeaders } };

  let response = NextResponse.next(nextInit);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next(nextInit);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Triggers a token refresh (and the setAll above) if the session is
  // stale. Must be getUser(), not getSession() — getSession() trusts the
  // cookie as-is without revalidating against Supabase.
  //
  // Time-bounded: a hung/slow Supabase Auth response here used to hang
  // this middleware on every single request site-wide, which a browser
  // shows as a hard "page couldn't load" failure. On timeout, this
  // request's cookies simply don't get refreshed this one time — the
  // response still proceeds instead of hanging; a genuinely stale
  // session just tries again on the next request rather than the
  // whole site going down with one slow auth check.
  const getUser = supabase.auth.getUser();
  // Same discriminated-union caveat as getCurrentUser() (server.ts) —
  // this synthetic value isn't a real API response.
  const timedOut = { data: { user: null }, error: null } as unknown as Awaited<typeof getUser>;
  await withTimeout(getUser, AUTH_CHECK_TIMEOUT_MS, timedOut);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
