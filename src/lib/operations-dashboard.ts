import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drivers, orders, serviceRequests } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

const ACTIVE_JOB_STATUSES = ["paid", "driver_assigned", "picked_up", "in_transit"] as const;
// A proxy for "probably not yet handled" — there's no acknowledgedAt/
// resolution column on `orders` to actually tell a fresh failure from
// one staff already resolved by phone weeks ago. Disclosed limitation,
// not a design nicety: without a recency bound this list only grows,
// and stops being an honest "needs attention" signal.
const FAILED_LOOKBACK_HOURS = 72;
const AGED_QUOTE_HOURS = 24;

/**
 * Everything the Operations Center dashboard (/internal/dispatch) needs,
 * in one place — mirrors src/lib/account-dashboard.ts's shape (a
 * Promise.all of narrow, purpose-built selects returning one flat
 * object), the customer-side precedent for exactly this kind of page.
 *
 * Every stat here is backed by a real, existing column — nothing is
 * fabricated. Notably absent, on purpose: a revenue trend/comparison
 * (no historical baseline exists anywhere to compare against), driver
 * availability (no calendar/availability schema exists), and anything
 * about "recurring requests awaiting approval" (that approval is a
 * customer-side action on their own order, not a staff to-do).
 */
export async function getOperationsDashboard() {
  // This data function, not just the page rendering it, is the real
  // authorization boundary — the DispatchLayout gate alone was never
  // meant to be the only thing standing between an authenticated
  // non-staff user and every customer's order/PII data.
  await requireStaff();
  const db = getDb();
  const now = new Date();
  // "Today" is a UTC-day boundary, not business-timezone-aware — there's
  // no timezone concept anywhere in this schema. Disclosed simplification:
  // the figure resets at UTC midnight, not local midnight.
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const failedSince = new Date(now.getTime() - FAILED_LOOKBACK_HOURS * 3_600_000);
  const agedQuoteBefore = new Date(now.getTime() - AGED_QUOTE_HOURS * 3_600_000);

  const [
    newLeadCount,
    orderStatusCounts,
    todaysRevenue,
    activeDriverCount,
    unassignedPaidOrders,
    agedConciergeQuotes,
    recentFailedOrders,
  ] = await Promise.all([
    db.select({ n: count() }).from(serviceRequests).where(eq(serviceRequests.status, "new")),

    // One groupBy covers "pending quotes," "awaiting payment," and
    // "active jobs" instead of three separate count() calls on the same
    // table — the DB pool is small (max: 5 per instance, see
    // src/lib/db/index.ts), so minimizing fan-out on one table matters
    // more here than it would on a page with headroom to spare.
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .where(inArray(orders.status, ["quote_pending", "priced", ...ACTIVE_JOB_STATUSES]))
      .groupBy(orders.status),

    // sum() returns a Postgres `numeric`, which surfaces as a string (or
    // null on zero rows) via postgres-js — coerced with Number() below.
    // First use of sum() in this codebase; every other aggregate here is
    // count().
    db
      .select({ total: sql<string | null>`sum(${orders.totalCents})` })
      .from(orders)
      .where(gte(orders.paidAt, startOfTodayUtc)),

    db.select({ n: count() }).from(drivers).where(eq(drivers.isActive, true)),

    // Needs attention: paid, no driver yet — oldest first (FIFO, same as
    // the queue page itself).
    db
      .select({ id: orders.id, customerName: orders.customerName, createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.status, "paid"))
      .orderBy(orders.createdAt)
      .limit(10),

    // Needs attention: a concierge quote or price sitting unresolved.
    db
      .select({ id: orders.id, customerName: orders.customerName, status: orders.status, createdAt: orders.createdAt })
      .from(orders)
      .where(and(inArray(orders.status, ["quote_pending", "priced"]), lt(orders.createdAt, agedQuoteBefore)))
      .orderBy(orders.createdAt)
      .limit(10),

    // Needs attention: recently failed — see FAILED_LOOKBACK_HOURS above.
    db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(eq(orders.status, "failed"), gte(orders.updatedAt, failedSince)))
      .orderBy(sql`${orders.updatedAt} desc`)
      .limit(10),
  ]);

  const countByStatus = Object.fromEntries(orderStatusCounts.map((r) => [r.status, r.n]));

  return {
    stats: {
      newLeads: newLeadCount[0]?.n ?? 0,
      pendingConciergeQuotes: countByStatus.quote_pending ?? 0,
      awaitingPayment: countByStatus.priced ?? 0,
      activeJobs: ACTIVE_JOB_STATUSES.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0),
      activeDrivers: activeDriverCount[0]?.n ?? 0,
      todaysRevenueCents: Number(todaysRevenue[0]?.total ?? 0),
    },
    needsAttention: {
      unassignedPaidOrders,
      agedConciergeQuotes,
      recentFailedOrders,
    },
  };
}
