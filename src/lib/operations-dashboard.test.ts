import { existsSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { WORK_QUEUE_TABS } from "@/lib/work-queue-types";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Same constraint and same shape as business-overview.test.ts's own
// test: getOperationsDashboard() calls requireStaff() internally, which
// reads a real Supabase session cookie via getCurrentUser() — nothing
// to inject a fake session with outside a real signed-in request, so
// the auth gate is mocked here rather than skipped. A structural smoke
// test against real (uncontrolled) production data, not a fixture-based
// test with known counts — but it directly pins down Priority 4's own
// risk (2026-09-09, master implementation directive): 8 buckets, each
// hand-mapped from a WorkQueueItem filter to a stats field and a
// dashboard tile — the real failure mode here isn't "wrong number", it's
// "right number under the wrong key", which a type-level check alone
// can't catch.
vi.mock("@/lib/auth/roles", () => ({
  requireStaff: vi.fn().mockResolvedValue({ id: "test", role: "staff", isActive: true }),
}));

describe("getOperationsDashboard", () => {
  it("returns a well-formed snapshot without crashing", async () => {
    const { getOperationsDashboard } = await import("@/lib/operations-dashboard");
    const { stats, needsAttention } = await getOperationsDashboard();

    for (const [key, value] of Object.entries(stats)) {
      if (key === "todaysRevenueCents") continue; // cents, not a count
      expect(Number.isInteger(value), `${key} should be an integer`).toBe(true);
      expect(value, `${key} should be non-negative`).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isFinite(stats.todaysRevenueCents)).toBe(true);
    expect(stats.todaysRevenueCents).toBeGreaterThanOrEqual(0);

    // The real check: every one of the 8 pipeline stats sums to exactly
    // the live, non-completed Work Queue — proving each stat is reading
    // its own real bucket, not silently double-counting one bucket
    // while dropping another (the two would still each individually
    // look like "a plausible small non-negative integer").
    const { getWorkQueue } = await import("@/lib/work-queue");
    const queue = await getWorkQueue();
    const byBucket = (bucket: string) => queue.filter((i) => i.bucket === bucket).length;

    expect(stats.newLeads + stats.pendingConciergeQuotes).toBe(byBucket("needs_quote"));
    expect(stats.awaitingPayment).toBe(byBucket("awaiting_customer"));
    expect(stats.processingPayment).toBe(byBucket("needs_payment"));
    expect(stats.readyToDispatch).toBe(byBucket("ready_to_dispatch"));
    expect(stats.awaitingDriverResponse).toBe(byBucket("awaiting_driver_response"));
    expect(stats.inProgress).toBe(byBucket("in_progress"));
    expect(stats.exceptions).toBe(byBucket("exceptions"));
    expect(stats.completed).toBe(byBucket("completed"));

    // Every stats key the dashboard's PIPELINE_TILES reads must exist —
    // catches a renamed/removed bucket in work-queue-types.ts silently
    // breaking a tile that still reads the old key name.
    const pipelineKeys = ["newLeads", "pendingConciergeQuotes", "awaitingPayment", "processingPayment",
      "readyToDispatch", "awaitingDriverResponse", "inProgress", "exceptions", "completed"];
    for (const key of pipelineKeys) {
      expect(stats, `stats.${key} should exist`).toHaveProperty(key);
    }
    // And every real Work Queue tab has a corresponding stat somewhere
    // in that list (needs_quote splits into two stats, by kind).
    expect(WORK_QUEUE_TABS.length).toBe(8);

    // recentFailedOrders is a time-bounded subset of the same exceptions
    // bucket, never larger than it.
    expect(needsAttention.recentFailedOrders.length).toBeLessThanOrEqual(stats.exceptions);
    expect(needsAttention.unassignedPaidOrders.length).toBeLessThanOrEqual(stats.readyToDispatch);
  });
});

afterAll(async () => {
  const { getDb } = await import("@/lib/db");
  await getDb().$client.end();
});
