import { NextResponse } from "next/server";
import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerProfiles, drivers, staff, memberships, orders } from "@/lib/db/schema";

/**
 * TEMPORARY diagnostic route (2026-09-20) — no auth, times each query
 * Business Overview runs individually (not just in Promise.all) from
 * this deployment's real Vercel region, to find out whether it's one
 * specific slow query, general cross-region latency, or a hang.
 * Remove once the "admin panel hangs" investigation concludes.
 */
export async function GET() {
  const db = getDb();
  const timings: Record<string, number> = {};
  const t0 = Date.now();

  async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const result = await fn();
    timings[label] = Date.now() - start;
    return result;
  }

  try {
    await time("staffLookup", () => db.select().from(staff).limit(1));
    await time("customerCount", () => db.select({ n: count() }).from(customerProfiles));
    await time("staffCounts", () => db.select({ isActive: staff.isActive, n: count() }).from(staff).groupBy(staff.isActive));
    await time("driverCounts", () => db.select({ isActive: drivers.isActive, n: count() }).from(drivers).groupBy(drivers.isActive));
    await time("membershipCounts", () =>
      db
        .select({ tier: memberships.tier, n: count() })
        .from(memberships)
        .where(eq(memberships.status, "active"))
        .groupBy(memberships.tier)
    );
    await time("lifetimeCompleted", () => db.select({ n: count() }).from(orders).where(eq(orders.status, "completed")));
    await time("lifetimeRevenue", () =>
      db.select({ total: sql<string | null>`sum(${orders.totalCents})` }).from(orders).where(isNotNull(orders.paidAt))
    );
    const revenueSince = new Date(Date.now() - 7 * 24 * 3_600_000);
    await time("weekRevenue", () =>
      db
        .select({ total: sql<string | null>`sum(${orders.totalCents})` })
        .from(orders)
        .where(and(isNotNull(orders.paidAt), gte(orders.paidAt, revenueSince)))
    );
    const failedSince = new Date(Date.now() - 72 * 3_600_000);
    await time("recentFailedCount", () =>
      db.select({ n: count() }).from(orders).where(and(eq(orders.status, "failed"), gte(orders.updatedAt, failedSince)))
    );

    return NextResponse.json({
      ok: true,
      region: process.env.VERCEL_REGION ?? "unknown",
      totalMs: Date.now() - t0,
      timings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        region: process.env.VERCEL_REGION ?? "unknown",
        totalMs: Date.now() - t0,
        timings,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
