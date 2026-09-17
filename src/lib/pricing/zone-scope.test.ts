import { describe, expect, it } from "vitest";
import { occupiesSameZoneSlot } from "./zone-scope";

/**
 * activatePricingRule() (pricing-management.ts) itself can't be
 * exercised live in this suite — it calls requireManager(), which
 * reads a real Supabase session cookie, same structural limit noted on
 * every other mutating action in this codebase (see
 * business-overview.test.ts's own comment). This covers the one piece
 * of logic that actually decides deactivation scope, which the real
 * action's Drizzle WHERE clause is built to match exactly (see
 * activatePricingRule's own doc comment).
 */
describe("occupiesSameZoneSlot", () => {
  const pickup = { market: "default", serviceType: "pickup", zoneKey: null };

  it("matches another unzoned row in the same market+service type — City Pickup's exact shape, unchanged by Phase 2", () => {
    expect(occupiesSameZoneSlot(pickup, { market: "default", serviceType: "pickup", zoneKey: null })).toBe(true);
  });

  it("does not match a row in a different service type, even if both are unzoned", () => {
    expect(occupiesSameZoneSlot(pickup, { market: "default", serviceType: "concierge", zoneKey: null })).toBe(false);
  });

  it("does not match a different market, even with the same service type and zone", () => {
    expect(occupiesSameZoneSlot(pickup, { market: "other", serviceType: "pickup", zoneKey: null })).toBe(false);
  });

  it("matches another row in the exact same zone slot (the intended activate/deactivate pairing)", () => {
    const remote = { market: "default", serviceType: "concierge", zoneKey: "remote" };
    expect(occupiesSameZoneSlot(remote, { market: "default", serviceType: "concierge", zoneKey: "remote" })).toBe(
      true
    );
  });

  it("does not match a sibling zone — this is the exact bug Phase 2 had to prevent", () => {
    const remote = { market: "default", serviceType: "concierge", zoneKey: "remote" };
    const near = { market: "default", serviceType: "concierge", zoneKey: "near" };
    expect(occupiesSameZoneSlot(remote, near)).toBe(false);
  });

  it("does not match an unzoned row against a zoned one, or vice versa", () => {
    const zoned = { market: "default", serviceType: "concierge", zoneKey: "near" };
    const unzoned = { market: "default", serviceType: "concierge", zoneKey: null };
    expect(occupiesSameZoneSlot(zoned, unzoned)).toBe(false);
    expect(occupiesSameZoneSlot(unzoned, zoned)).toBe(false);
  });
});
