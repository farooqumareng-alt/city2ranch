import { count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drivers, orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { getWorkQueue, type WorkQueueItem } from "@/lib/work-queue";

// A proxy for "probably not yet handled" — there's no acknowledgedAt/
// resolution column on `orders` to actually tell a fresh failure from
// one staff already resolved by phone weeks ago. Disclosed limitation,
// not a design nicety: without a recency bound this list only grows,
// and stops being an honest "needs attention" signal. Unlike the old
// 24-hour quote filter this replaces, this bound only ever *hides old*
// items — it never blocks a brand-new one from appearing, which is
// exactly the distinction the 2026-09-01 lifecycle audit called out.
const FAILED_LOOKBACK_HOURS = 72;
const ATTENTION_LIMIT = 10;

/**
 * Everything the Operations Center dashboard (/internal/dispatch) needs.
 *
 * Rewritten 2026-09-01 (lifecycle audit, issue #5) to derive its stats
 * and "Needs Attention" feed from getWorkQueue() — the same source
 * Work Queue itself already gets right — instead of a second,
 * separately-written set of queries. The two screens disagreeing was
 * the actual bug (a fresh request/quote showed on Work Queue
 * immediately but took 24 hours to reach this page's Needs Attention);
 * this closes that by having one authoritative query, not two.
 *
 * Still queried separately: active driver count and today's revenue —
 * genuinely not part of "what does staff need to work on," so there's
 * nothing to unify there.
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

  const [workQueue, todaysRevenue, activeDriverCount] = await Promise.all([
    getWorkQueue(),
    db
      .select({ total: sql<string | null>`sum(${orders.totalCents})` })
      .from(orders)
      .where(gte(orders.paidAt, startOfTodayUtc)),
    db.select({ n: count() }).from(drivers).where(eq(drivers.isActive, true)),
  ]);

  const byBucket = (bucket: WorkQueueItem["bucket"]) => workQueue.filter((i) => i.bucket === bucket);

  const needsQuote = byBucket("needs_quote"); // requests + orders, no age filter — the actual fix
  const newLeads = needsQuote.filter((i) => i.kind === "request");
  const pendingConciergeQuotes = needsQuote.filter((i) => i.kind === "order");
  const awaitingCustomer = byBucket("awaiting_customer");
  const readyToDispatch = byBucket("ready_to_dispatch");
  const inProgress = [...byBucket("awaiting_driver_response"), ...byBucket("in_progress")];
  const recentFailed = byBucket("exceptions").filter((i) => i.updatedAt >= failedSince);

  return {
    stats: {
      newLeads: newLeads.length,
      pendingConciergeQuotes: pendingConciergeQuotes.length,
      awaitingPayment: awaitingCustomer.length,
      activeJobs: readyToDispatch.length + inProgress.length,
      activeDrivers: activeDriverCount[0]?.n ?? 0,
      todaysRevenueCents: Number(todaysRevenue[0]?.total ?? 0),
    },
    needsAttention: {
      // Every needs-quote item (request or order), immediately — the
      // core fix: this used to only include orders older than 24 hours.
      needsQuote: needsQuote.slice(0, ATTENTION_LIMIT),
      // Paid, no driver offered yet.
      unassignedPaidOrders: readyToDispatch.slice(0, ATTENTION_LIMIT),
      recentFailedOrders: recentFailed.slice(0, ATTENTION_LIMIT),
    },
  };
}
