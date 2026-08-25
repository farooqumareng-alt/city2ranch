import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

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
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
