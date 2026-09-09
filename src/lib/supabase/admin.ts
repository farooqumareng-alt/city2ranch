import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Full-privilege Supabase client for the one thing the anon-key clients
 * (server.ts/client.ts) can never do: inviting a brand-new driver by
 * email (supabase.auth.admin.inviteUserByEmail) before they've ever
 * signed in — see inviteDriver() in team-management.ts. This key
 * bypasses every RLS policy and can manage any auth account, so:
 *   - never import this file from a client component ("use client") —
 *     nothing here is meant to run in the browser.
 *   - never use it for table access — that always goes through Drizzle
 *     (getDb()), exactly like every other Supabase client in this app;
 *     this one is for auth administration only.
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY lazily (like getDb()/getResend()) so a
 * missing key surfaces as a catchable error at the one call site that
 * needs it, not a startup crash for the whole app.
 */
export function getSupabaseAdmin() {
  if (cached) return cached;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  cached = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
