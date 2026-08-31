import { existsSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// getBusinessOverview() calls requireSuperAdmin() internally, which
// reads a real Supabase session cookie via getCurrentUser() — nothing
// to inject a fake session with outside a real signed-in request, so
// the auth gate itself is mocked here rather than skipped. This is a
// structural smoke test against the real (uncontrolled) production
// data, not a behavioral test with known fixture counts — there's no
// isolated-transaction path available here the way lifecycle-
// integration.test.ts has for getMyServices/getWorkQueue, since
// requireSuperAdmin's own getDb() call can't be pointed at this test's
// transaction. It still catches a real class of bug: a query that
// throws, returns the wrong shape, or produces a negative/NaN count.
vi.mock("@/lib/auth/roles", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ id: "test", role: "super_admin", isActive: true }),
}));

describe("getBusinessOverview", () => {
  it("returns a well-formed snapshot without crashing", async () => {
    const { getBusinessOverview } = await import("@/lib/business-overview");
    const data = await getBusinessOverview();

    expect(Number.isInteger(data.customers.total)).toBe(true);
    expect(data.customers.total).toBeGreaterThanOrEqual(0);

    expect(Number.isInteger(data.team.activeStaff)).toBe(true);
    expect(Number.isInteger(data.team.activeDrivers)).toBe(true);
    expect(data.team.activeStaff).toBeGreaterThanOrEqual(0);
    expect(data.team.activeDrivers).toBeGreaterThanOrEqual(0);

    expect(Number.isInteger(data.memberships.active)).toBe(true);
    expect(data.memberships.active).toBeGreaterThanOrEqual(0);
    // byTier's own counts must sum to the same total — two independent
    // aggregates (SUM of a GROUP BY vs. a flat COUNT) computed from the
    // same underlying rows should never disagree.
    const tierSum = Object.values(data.memberships.byTier).reduce((a, b) => a + b, 0);
    expect(tierSum).toBe(data.memberships.active);

    expect(Number.isFinite(data.revenue.lifetimeCents)).toBe(true);
    expect(Number.isFinite(data.revenue.last7DaysCents)).toBe(true);
    expect(data.revenue.lifetimeCents).toBeGreaterThanOrEqual(0);
    expect(data.revenue.last7DaysCents).toBeGreaterThanOrEqual(0);
    // Lifetime revenue can never be less than a trailing 7-day slice of
    // the same paid orders.
    expect(data.revenue.lifetimeCents).toBeGreaterThanOrEqual(data.revenue.last7DaysCents);

    expect(Number.isInteger(data.fulfillment.lifetimeCompleted)).toBe(true);
    expect(Number.isInteger(data.fulfillment.recentFailed)).toBe(true);
  });
});

afterAll(async () => {
  const { getDb } = await import("@/lib/db");
  await getDb().$client.end();
});
