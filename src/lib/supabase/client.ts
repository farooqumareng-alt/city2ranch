"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Browser Supabase client — used only by the sign-in form's
 * `signInWithOtp` call. Everything else (reading who's signed in,
 * reading/writing data) happens server-side.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
