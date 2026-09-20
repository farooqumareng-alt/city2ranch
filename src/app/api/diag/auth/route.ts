import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { withTimeout } from "@/lib/timeout";

/**
 * TEMPORARY diagnostic route (2026-09-20) — exercises the real
 * authenticated path (must be visited signed-in, in a browser, so the
 * real session cookie is sent) and times each step separately: the raw
 * unclamped Supabase auth.getUser() call, the app's own timeout-guarded
 * getCurrentUser(), and the staff table lookup. Remove once the "admin
 * panel hangs while signed in" investigation concludes.
 */
export async function GET() {
  const timings: Record<string, number> = {};
  const notes: string[] = [];
  const t0 = Date.now();

  // Step 1: the raw call, bounded only by a generous 20s diagnostic
  // ceiling (so this route itself doesn't hang forever) — this is
  // BEFORE the app's own 5s timeout fix, to see the true, unclamped
  // latency/behavior.
  const TIMED_OUT = "DIAG_20S_TIMEOUT";
  try {
    const supabase = await createSupabaseServerClient();
    const step1Start = Date.now();
    const rawCall = supabase.auth.getUser();
    const fallback = { data: { user: null }, error: null, __diag: TIMED_OUT } as unknown as Awaited<typeof rawCall>;
    const result = await withTimeout(rawCall, 20000, fallback);
    timings.rawGetUser = Date.now() - step1Start;
    if ((result as unknown as { __diag?: string }).__diag === TIMED_OUT) {
      notes.push("raw supabase.auth.getUser() did NOT settle within 20s — genuinely hanging, not just slow.");
    } else if (result.error) {
      notes.push(`raw getUser() returned an error: ${result.error.message}`);
    } else {
      notes.push(`raw getUser() resolved, user present: ${Boolean(result.data.user)}`);
    }
  } catch (e) {
    notes.push(`raw getUser() threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 2: the app's own timeout-guarded path.
  const step2Start = Date.now();
  const user = await getCurrentUser();
  timings.getCurrentUser = Date.now() - step2Start;

  // Step 3: the staff table lookup requireStaff() does, timed
  // separately (that call site has no timeout of its own).
  if (user) {
    const db = getDb();
    const step3Start = Date.now();
    const rows = await db.select().from(staff).where(eq(staff.authUserId, user.id));
    timings.staffLookup = Date.now() - step3Start;
    notes.push(`staff row found: ${rows.length > 0}, isActive: ${rows[0]?.isActive}`);
  } else {
    notes.push("no user resolved by getCurrentUser() — either genuinely signed out, or its timeout fired.");
  }

  return NextResponse.json({
    ok: true,
    region: process.env.VERCEL_REGION ?? "unknown",
    totalMs: Date.now() - t0,
    timings,
    notes,
  });
}
