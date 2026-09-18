import { describe, expect, it } from "vitest";
import { selectZoneMatch, type PricingRuleRow } from "./repository";

/** Minimal fixture — only the zone fields matter to selectZoneMatch();
 *  everything else is filled with harmless placeholder values so the
 *  type is satisfied without every test having to restate it. */
function zoneRow(overrides: Partial<PricingRuleRow>): PricingRuleRow {
  return {
    id: "rule-id",
    isActive: true,
    updatedAt: new Date("2026-01-01"),
    baseFeeCents: 0,
    perMileCents: 0,
    minFeeCents: null,
    serviceLabel: "Test Service",
    contractorFlatCostCents: null,
    contractorPerMileCostCents: null,
    sustainableCostAllowanceCents: null,
    targetMarginPercent: null,
    zoneKey: null,
    zoneLabel: null,
    zoneMinMiles: null,
    zoneMaxMiles: null,
    ...overrides,
  };
}

describe("selectZoneMatch", () => {
  it("returns null when there are no active rows", () => {
    expect(selectZoneMatch([], 40, "concierge")).toBeNull();
  });

  it("returns the single unzoned row unconditionally, regardless of mileage", () => {
    const rule = zoneRow({ id: "flat-rule" });
    expect(selectZoneMatch([rule], 999, "concierge")).toBe(rule);
    expect(selectZoneMatch([rule], 0, "concierge")).toBe(rule);
  });

  it("throws if more than one unzoned row is active (pre-existing invariant, unchanged)", () => {
    const a = zoneRow({ id: "a" });
    const b = zoneRow({ id: "b" });
    expect(() => selectZoneMatch([a, b], 40, "concierge")).toThrow(/expected exactly one/);
  });

  it("matches the zone whose band contains the mileage", () => {
    const near = zoneRow({ id: "near", zoneKey: "near", zoneLabel: "Standard Service", zoneMinMiles: 0, zoneMaxMiles: 30 });
    const extended = zoneRow({
      id: "extended",
      zoneKey: "extended",
      zoneLabel: "Extended Service",
      zoneMinMiles: 30.1,
      zoneMaxMiles: 60,
    });
    expect(selectZoneMatch([near, extended], 20, "concierge")).toBe(near);
    expect(selectZoneMatch([near, extended], 45, "concierge")).toBe(extended);
  });

  it("treats zoneMinMiles/zoneMaxMiles as inclusive bounds", () => {
    const zone = zoneRow({ id: "zone", zoneKey: "near", zoneMinMiles: 0, zoneMaxMiles: 30 });
    expect(selectZoneMatch([zone], 0, "concierge")).toBe(zone);
    expect(selectZoneMatch([zone], 30, "concierge")).toBe(zone);
  });

  it("treats a null zoneMaxMiles as open-ended (the top zone)", () => {
    const estate = zoneRow({ id: "estate", zoneKey: "estate_rural", zoneMinMiles: 80, zoneMaxMiles: null });
    expect(selectZoneMatch([estate], 95, "concierge")).toBe(estate);
    expect(selectZoneMatch([estate], 1000, "concierge")).toBe(estate);
  });

  it("returns null when the mileage falls outside every configured zone", () => {
    const near = zoneRow({ id: "near", zoneKey: "near", zoneMinMiles: 0, zoneMaxMiles: 30 });
    const estate = zoneRow({ id: "estate", zoneKey: "estate_rural", zoneMinMiles: 80, zoneMaxMiles: 100 });
    // Between 30 and 80 — a gap the business hasn't configured a zone
    // for — must fall back to "not configured," never invent a price.
    expect(selectZoneMatch([near, estate], 50, "concierge")).toBeNull();
    // Past the top zone's upper bound entirely.
    expect(selectZoneMatch([near, estate], 150, "concierge")).toBeNull();
  });

  it("throws when zone bands overlap (a real configuration bug, never guessed at)", () => {
    const a = zoneRow({ id: "a", zoneKey: "a", zoneMinMiles: 0, zoneMaxMiles: 50 });
    const b = zoneRow({ id: "b", zoneKey: "b", zoneMinMiles: 40, zoneMaxMiles: 80 });
    expect(() => selectZoneMatch([a, b], 45, "concierge")).toThrow(/overlap/);
  });

  it("throws when zoned and unzoned active rows coexist for the same service type", () => {
    const flat = zoneRow({ id: "flat" });
    const zoned = zoneRow({ id: "zoned", zoneKey: "near", zoneMinMiles: 0, zoneMaxMiles: 30 });
    expect(() => selectZoneMatch([flat, zoned], 20, "concierge")).toThrow(/can't coexist/);
  });
});
