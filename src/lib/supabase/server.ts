import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { withTimeout } from "@/lib/timeout";

// 2026-09-20 incident: a real Supabase auth.getUser() call with no
// timeout on every gated page — see withTimeout()'s own doc comment
// for the full failure mode this guards against. Shortened from 5000ms
// after root-causing the same incident further: the admin panel still
// 504'd with the 5s timeout in place, meaning Vercel's own platform-
// level function timeout (unknown exact value on this Hobby-tier
// project, not configurable/inspectable from here) was shorter than
// 5s once combined with the rest of the request — this value needs
// real margin under whatever that ceiling is, not just "generous."
// Real-world queries against this exact Supabase project measured
// under 1s even from a cold connection (see the deep-test investigation
// this incident produced) — 3s is still comfortably above normal
// latency, just no longer competing with the platform's own timeout.
const AUTH_CHECK_TIMEOUT_MS = 3000;

/**
 * Supabase client for server components, server actions, and route
 * handlers. Identity only — never used for table queries; all data
 * access goes through Drizzle (`getDb()`), so this client's job is
 * strictly "who is signed in."
 *
 * Create a fresh client per request (per Supabase's own guidance) rather
 * than caching a singleton — cookies differ per request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written. Harmless as long as `src/proxy.ts` also refreshes the
          // session on every request — see that file's comment.
        }
      },
    },
  });
}

/**
 * Convenience: the signed-in user, or null.
 *
 * Wrapped in React's cache() — every account/dispatch/driver layout
 * calls this once for its own auth gate, and every page under it calls
 * it again for its own (never-skip-the-real-check) re-verification.
 * Before this, that meant two full supabase.auth.getUser() network
 * round trips (a real request to Supabase's auth server, not a local
 * check) on every single page view. cache() scopes the memoization to
 * this one request only — see the React/Next docs on request
 * memoization — so the second call becomes free, without weakening the
 * "every action re-verifies itself" security posture at all: it's the
 * same underlying check, just not repeated on the wire.
 *
 * Time-bounded (2026-09-20) — a slow/hung Supabase Auth response used
 * to hang this indefinitely, which meant every gated page render hung
 * with it until Vercel's own function timeout killed the connection
 * (a browser-level "page couldn't load" failure, nothing logged). A
 * timeout here degrades to "treat as signed out" instead — every
 * caller already redirects to /sign-in on a null user, the same fail-
 * closed behavior a real signed-out visitor gets, never a hang. A
 * genuine error from Supabase (not just slowness) still propagates
 * normally — this only guards against never settling.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const getUser = supabase.auth.getUser();
  // Supabase's UserResponse is a discriminated union (a null user always
  // pairs with a real AuthError) — this synthetic "timed out" value
  // isn't a real API response, so it's asserted past that union rather
  // than fabricating a fake AuthError just to satisfy the shape.
  const timedOut = { data: { user: null }, error: null } as unknown as Awaited<typeof getUser>;
  const {
    data: { user },
  } = await withTimeout(getUser, AUTH_CHECK_TIMEOUT_MS, timedOut);
  return user;
});
