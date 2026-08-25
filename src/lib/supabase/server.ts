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

/** Convenience: the signed-in user, or null. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
