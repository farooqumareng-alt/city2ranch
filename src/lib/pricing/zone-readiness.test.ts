import { describe, expect, it } from "vitest";
import { getZoneReadiness, getActiveCostWarnings, summarizeZoneSet, PLACEHOLDER_BASE_FEE_CENTS, type ZoneReadinessInput } from "./zone-readiness";

const complete = {
  isActive: false,
  baseFeeCents: 9500,
  contractorFlatCostCents: 1500,
  contractorPerMileCostCents: 120,
  sustainableCostAllowanceCents: 2000,
  targetMarginPercent: 40,
};

describe("getZoneReadiness", () => {
  it("is ready_for_review when every field is filled in with a real-looking value", () => {
    expect(getZoneReadiness(complete)).toEqual({ status: "ready_for_review", missing: [] });
  });

  it("is incomplete when the base fee is still the seeded placeholder", () => {
    const result = getZoneReadiness({ ...complete, baseFeeCents: PLACEHOLDER_BASE_FEE_CENTS });
    expect(result.status).toBe("incomplete");
    expect(result.missing).toContain("Base fee (still the placeholder value)");
  });

  it("is incomplete when any single cost field is null", () => {
    expect(getZoneReadiness({ ...complete, contractorFlatCostCents: null }).status).toBe("incomplete");
    expect(getZoneReadiness({ ...complete, contractorPerMileCostCents: null }).status).toBe("incomplete");
    expect(getZoneReadiness({ ...complete, sustainableCostAllowanceCents: null }).status).toBe("incomplete");
    expect(getZoneReadiness({ ...complete, targetMarginPercent: null }).status).toBe("incomplete");
  });

  it("lists every missing field, not just the first", () => {
    const result = getZoneReadiness({
      ...complete,
      contractorFlatCostCents: null,
      targetMarginPercent: null,
    });
    expect(result.missing).toEqual(["Contractor flat cost", "Target margin"]);
  });

  it("is exactly the real production seed state today: inactive, $0.01, every cost field null", () => {
    const result = getZoneReadiness({
      isActive: false,
      baseFeeCents: PLACEHOLDER_BASE_FEE_CENTS,
      contractorFlatCostCents: null,
      contractorPerMileCostCents: null,
      sustainableCostAllowanceCents: null,
      targetMarginPercent: null,
    });
    expect(result.status).toBe("incomplete");
    expect(result.missing).toHaveLength(5);
  });

  it("isActive:true always wins, regardless of field completeness — proves City Pickup keeps showing Active", () => {
    const result = getZoneReadiness({
      isActive: true,
      baseFeeCents: 1500,
      contractorFlatCostCents: null,
      contractorPerMileCostCents: null,
      sustainableCostAllowanceCents: null,
      targetMarginPercent: null,
    });
    expect(result).toEqual({ status: "active", missing: [] });
  });

  it("isActive:true even with the literal placeholder base fee still wins (never retroactively flagged)", () => {
    const result = getZoneReadiness({ ...complete, isActive: true, baseFeeCents: PLACEHOLDER_BASE_FEE_CENTS });
    expect(result.status).toBe("active");
  });
});

describe("getActiveCostWarnings (Build 2 — PRC-02)", () => {
  it("names every missing cost field on an active row (City Pickup's real state)", () => {
    expect(
      getActiveCostWarnings({
        isActive: true,
        baseFeeCents: 1000,
        contractorFlatCostCents: null,
        contractorPerMileCostCents: null,
        sustainableCostAllowanceCents: null,
        targetMarginPercent: null,
      })
    ).toEqual(["Contractor flat cost", "Contractor per-mile cost", "Sustainable cost allowance", "Target margin"]);
  });

  it("is empty for a fully configured active row and for any inactive row", () => {
    expect(getActiveCostWarnings({ ...complete, isActive: true })).toEqual([]);
    expect(getActiveCostWarnings(complete)).toEqual([]);
  });
});

describe("summarizeZoneSet (Build 2 — QA-006)", () => {
  const zoned = (zoneKey: string, overrides: Partial<ZoneReadinessInput>) => ({
    ...complete,
    ...overrides,
    zoneKey,
  });

  it("ignores unzoned rows entirely", () => {
    const summary = summarizeZoneSet([{ ...complete, zoneKey: null }]);
    expect(summary.total).toBe(0);
    expect(summary.canActivate).toBe(false);
  });

  it("canActivate when every zone is active or ready and at least one is ready", () => {
    const summary = summarizeZoneSet([
      zoned("near", { isActive: true }),
      zoned("extended", {}),
      zoned("remote", {}),
    ]);
    expect(summary).toMatchObject({ total: 3, active: 1, ready: 2, incomplete: [], canActivate: true });
  });

  it("refuses (canActivate false) and names the incomplete zone and its gaps", () => {
    const summary = summarizeZoneSet([
      zoned("near", {}),
      zoned("remote", { contractorFlatCostCents: null, targetMarginPercent: null }),
    ]);
    expect(summary.canActivate).toBe(false);
    expect(summary.incomplete).toEqual([
      { zoneKey: "remote", missing: ["Contractor flat cost", "Target margin"] },
    ]);
  });

  it("canActivate is false when the set is already fully active (nothing to do)", () => {
    const summary = summarizeZoneSet([zoned("near", { isActive: true }), zoned("remote", { isActive: true })]);
    expect(summary).toMatchObject({ total: 2, active: 2, ready: 0, canActivate: false });
  });
});
