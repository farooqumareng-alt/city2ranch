import { NextResponse } from "next/server";

/**
 * TEMPORARY diagnostic route (2026-09-20) — no DB, no auth, just proves
 * a Vercel function invocation itself completes quickly from this
 * deployment's actual region. Remove once the "admin panel hangs"
 * investigation concludes.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    region: process.env.VERCEL_REGION ?? "unknown",
    now: new Date().toISOString(),
  });
}
