import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

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
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
