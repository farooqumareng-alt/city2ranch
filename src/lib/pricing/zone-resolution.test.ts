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
    stripeFeePercent: null,
    stripeFeeFixedCents: null,
    zoneKey: null,
    zoneLabel: null,
    zoneMinMiles: null,
    zoneMaxMiles: null,
    ...overrides,
  };
}

/** The business's configured Concierge zones under threshold
 *  semantics (Build 2): each zone starts at its mileage and runs
 *  until the next zone's start. */
function configuredZones(): PricingRuleRow[] {
  return [
    zoneRow({ id: "near", zoneKey: "near", zoneLabel: "Near Service", zoneMinMiles: 20 }),
    zoneRow({ id: "extended", zoneKey: "extended", zoneLabel: "Extended Service", zoneMinMiles: 50 }),
    zoneRow({ id: "remote", zoneKey: "remote", zoneLabel: "Remote Service", zoneMinMiles: 90 }),
    zoneRow({ id: "estate", zoneKey: "estate_rural", zoneLabel: "Estate Rural Service", zoneMinMiles: 150 }),
  ];
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

  it("matches the zone with the greatest starting mileage at or below the trip mileage", () => {
    const zones = configuredZones();
    expect(selectZoneMatch(zones, 32, "concierge")?.id).toBe("near"); // Haslet
    expect(selectZoneMatch(zones, 44, "concierge")?.id).toBe("near"); // Justin
    expect(selectZoneMatch(zones, 60, "concierge")?.id).toBe("extended"); // Ponder
    expect(selectZoneMatch(zones, 120, "concierge")?.id).toBe("remote");
    expect(selectZoneMatch(zones, 229.2, "concierge")?.id).toBe("estate"); // farthest served ZIP
  });

  it("assigns fractional mileages to exactly one zone — no seams between zones", () => {
    // The old inclusive-band model stranded 49.1–49.9, 89.1–89.9 and
    // 149.1–149.9 in NO zone (bands were saved as 20–49, 50–89, …).
    // Thresholds have no seams by construction.
    const zones = configuredZones();
    expect(selectZoneMatch(zones, 49.5, "concierge")?.id).toBe("near");
    expect(selectZoneMatch(zones, 49.9, "concierge")?.id).toBe("near");
    expect(selectZoneMatch(zones, 89.9, "concierge")?.id).toBe("extended");
    expect(selectZoneMatch(zones, 149.9, "concierge")?.id).toBe("remote");
  });

  it("puts a trip exactly ON a zone start in the zone that starts there", () => {
    // The QA audit's boundary defect: at exactly 30/60/80 under the
    // old bands, save-time and match-time disagreed and the matcher
    // threw. A threshold start is unambiguous.
    const zones = configuredZones();
    expect(selectZoneMatch(zones, 20, "concierge")?.id).toBe("near");
    expect(selectZoneMatch(zones, 50, "concierge")?.id).toBe("extended");
    expect(selectZoneMatch(zones, 90, "concierge")?.id).toBe("remote");
    expect(selectZoneMatch(zones, 150, "concierge")?.id).toBe("estate");
  });

  it("returns null below the lowest zone's start — never an invented price", () => {
    const zones = configuredZones();
    expect(selectZoneMatch(zones, 19.9, "concierge")).toBeNull();
    expect(selectZoneMatch(zones, 12, "concierge")).toBeNull(); // the base ZIP itself
    expect(selectZoneMatch(zones, 0, "concierge")).toBeNull();
  });

  it("ignores the legacy zoneMaxMiles column entirely", () => {
    // A stale band value on a row (saved before threshold semantics)
    // must not cap its zone anymore.
    const near = zoneRow({ id: "near", zoneKey: "near", zoneMinMiles: 20, zoneMaxMiles: 49 });
    expect(selectZoneMatch([near], 75, "concierge")?.id).toBe("near");
  });

  it("throws when two active zones share the same starting mileage (ambiguous, never guessed at)", () => {
    const a = zoneRow({ id: "a", zoneKey: "a", zoneMinMiles: 20 });
    const b = zoneRow({ id: "b", zoneKey: "b", zoneMinMiles: 20 });
    expect(() => selectZoneMatch([a, b], 30, "concierge")).toThrow(/same mileage/);
  });

  it("throws when zoned and unzoned active rows coexist for the same service type", () => {
    const flat = zoneRow({ id: "flat" });
    const zoned = zoneRow({ id: "zoned", zoneKey: "near", zoneMinMiles: 20 });
    expect(() => selectZoneMatch([flat, zoned], 20, "concierge")).toThrow(/can't coexist/);
  });
});
