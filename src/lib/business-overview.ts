import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerProfiles, drivers, staff, memberships, orders } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";

const RECENT_FAILED_LOOKBACK_HOURS = 72; // same window/limitation as operations-dashboard.ts
const REVENUE_LOOKBACK_DAYS = 7;

/**
 * The Super Admin "Business Overview" (approved UX blueprint, Phase 5) —
 * deliberately distinct from getOperationsDashboard(): that page answers
 * "what needs a staff member's attention today," this one answers "how
 * healthy is the business" — lifetime/relationship counts a day-to-day
 * operator doesn't need, not a duplicate of the same today-only stats.
 *
 * No revenue trend or chart here on purpose — there's no historical
 * baseline stored anywhere to compare against (same disclosed limitation
 * operations-dashboard.ts already states); this is real current totals
 * only, not a fabricated analytics view.
 */
export async function getBusinessOverview() {
  await requireSuperAdmin();
  const db = getDb();
  const revenueSince = new Date(Date.now() - REVENUE_LOOKBACK_DAYS * 24 * 3_600_000);
  const failedSince = new Date(Date.now() - RECENT_FAILED_LOOKBACK_HOURS * 3_600_000);

  const [
    customerCount,
    staffCounts,
    driverCounts,
    membershipCounts,
    lifetimeCompleted,
    lifetimeRevenue,
    weekRevenue,
    recentFailedCount,
  ] = await Promise.all([
    db.select({ n: count() }).from(customerProfiles),

    db
      .select({ isActive: staff.isActive, n: count() })
      .from(staff)
      .groupBy(staff.isActive),

    db
      .select({ isActive: drivers.isActive, n: count() })
      .from(drivers)
      .groupBy(drivers.isActive),

    db
      .select({ tier: memberships.tier, n: count() })
      .from(memberships)
      .where(eq(memberships.status, "active"))
      .groupBy(memberships.tier),

    db.select({ n: count() }).from(orders).where(eq(orders.status, "completed")),

    // sum() returns a Postgres `numeric`, surfaced as a string (or null
    // on zero rows) via postgres-js — same coercion operations-dashboard.ts
    // already uses for its own sum().
    db
      .select({ total: sql<string | null>`sum(${orders.totalCents})` })
      .from(orders)
      .where(isNotNull(orders.paidAt)),

    db
      .select({ total: sql<string | null>`sum(${orders.totalCents})` })
      .from(orders)
      .where(and(isNotNull(orders.paidAt), gte(orders.paidAt, revenueSince))),

    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.status, "failed"), gte(orders.updatedAt, failedSince))),
  ]);

  const staffByActive = Object.fromEntries(staffCounts.map((r) => [String(r.isActive), r.n]));
  const driversByActive = Object.fromEntries(driverCounts.map((r) => [String(r.isActive), r.n]));

  return {
    customers: {
      total: customerCount[0]?.n ?? 0,
    },
    team: {
      activeStaff: staffByActive.true ?? 0,
      disabledStaff: staffByActive.false ?? 0,
      activeDrivers: driversByActive.true ?? 0,
      disabledDrivers: driversByActive.false ?? 0,
    },
    memberships: {
      active: membershipCounts.reduce((sum, r) => sum + r.n, 0),
      byTier: Object.fromEntries(membershipCounts.map((r) => [r.tier, r.n])),
    },
    revenue: {
      lifetimeCents: Number(lifetimeRevenue[0]?.total ?? 0),
      last7DaysCents: Number(weekRevenue[0]?.total ?? 0),
    },
    fulfillment: {
      lifetimeCompleted: lifetimeCompleted[0]?.n ?? 0,
      recentFailed: recentFailedCount[0]?.n ?? 0,
    },
  };
}
