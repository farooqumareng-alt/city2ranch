import { describe, expect, it } from "vitest";
import { getZoneReadiness, PLACEHOLDER_BASE_FEE_CENTS } from "./zone-readiness";

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
