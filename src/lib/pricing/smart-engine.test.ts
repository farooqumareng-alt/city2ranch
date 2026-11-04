import { describe, expect, it } from "vitest";
import {
  bandForMiles,
  priceRequest,
  type SmartPolicy,
  type SmartPriceRequest,
  type SmartRateCard,
} from "./smart-engine";

// Test fixtures only — the business's real rates are deferred and are
// NOT these numbers. They exist so the math can be verified exactly.
const rateCard: SmartRateCard = {
  version: "test-rates-1",
  contractorFlatByBandCents: {
    LOCAL: 4000,
    NEAR: 6000,
    EXTENDED: 9000,
    REMOTE: 12000,
    ESTATE_RURAL: 18000,
  },
  staffHourlyRateCents: 2500,
  vehiclePerMileCents: 65,
  supportAllowanceCents: 3500,
  consumablesCents: 500,
  failureAllowanceCents: 500,
  stripePercent: 2.9,
  stripeFixedCents: 30,
};

const policy: SmartPolicy = {
  version: "test-policy-1",
  targetMarginPercent: 50,
  minContributionCents: 2500,
  minFeeCents: null,
  autoApprovalCeilingCents: 100000,
  quoteExpiryMinutes: 4320,
  roundUpToCents: null,
  urgencyPriorityPercent: 10,
  urgencyRushPercent: 25,
  scarcityTightPercent: 10,
  scarcityScarcePercent: 20,
  complexityComplexPercent: 15,
  scheduleOffHoursPercent: 10,
  routeDensityCreditPercent: 10,
};

const request: SmartPriceRequest = {
  serviceType: "concierge",
  roundTripMiles: 32,
  incrementalMiles: null,
  estimatedDriveMinutes: 50,
  estimatedShopMinutes: 40,
  estimatedWaitMinutes: 10,
  compensationType: "contractor_flat",
  extraStops: 0,
  minutesPerExtraStop: 10,
  complexity: "standard",
  urgency: "scheduled",
  scheduleBand: "standard",
  slotScarcity: "normal",
  routed: false,
  requestedAt: new Date("2026-11-04T12:00:00Z"),
};

describe("bandForMiles", () => {
  it("assigns every mileage to exactly one band with no fractional gaps", () => {
    expect(bandForMiles(0)).toBe("LOCAL");
    expect(bandForMiles(12)).toBe("LOCAL");
    expect(bandForMiles(19.9)).toBe("LOCAL");
    expect(bandForMiles(20)).toBe("NEAR");
    expect(bandForMiles(49.9)).toBe("NEAR");
    expect(bandForMiles(49.5)).toBe("NEAR");
    expect(bandForMiles(50)).toBe("EXTENDED");
    expect(bandForMiles(89.9)).toBe("EXTENDED");
    expect(bandForMiles(90)).toBe("REMOTE");
    expect(bandForMiles(149.9)).toBe("REMOTE");
    expect(bandForMiles(150)).toBe("ESTATE_RURAL");
    expect(bandForMiles(229.2)).toBe("ESTATE_RURAL");
  });
});

describe("priceRequest — canonical concierge job", () => {
  const result = priceRequest(request, policy, rateCard);

  it("prices the job and lands on the target margin after fees", () => {
    // labor 6000 (NEAR flat) + vehicle 65×32=2080 + other 4500 = 12580
    expect(result.status).toBe("AUTO_PRICED");
    expect(result.band).toBe("NEAR");
    expect(result.directCostCents).toBe(12580);
    // break-even solves (12580+30)/(1−0.029) exactly
    expect(result.breakEvenCents).toBe(12987);
    // target solves (12580+30)/(1−0.029−0.50)
    expect(result.targetCents).toBe(26773);
    expect(result.finalCents).toBe(26773);
    expect(result.predictedMarginPercent).toBeCloseTo(50, 1);
    expect(result.confidence).toBe("high");
  });

  it("sets expiry from the caller-supplied time (72h policy)", () => {
    expect(result.expiresAt).toBe("2026-11-07T12:00:00.000Z");
  });

  it("is deterministic — identical inputs reproduce the identical result", () => {
    expect(priceRequest(request, policy, rateCard)).toEqual(result);
  });
});

describe("priceRequest — compensation models", () => {
  it("prices full-time labor as hourly × estimated paid minutes", () => {
    const result = priceRequest(
      { ...request, compensationType: "staff_hourly" },
      policy,
      rateCard
    );
    // 100 paid minutes at 2500¢/h → 4167¢
    expect(result.laborCents).toBe(4167);
    expect(result.status).toBe("AUTO_PRICED");
  });

  it("counts extra stops in paid minutes for hourly labor", () => {
    const result = priceRequest(
      { ...request, compensationType: "staff_hourly", extraStops: 2 },
      policy,
      rateCard
    );
    expect(result.estimatedPaidMinutes).toBe(120);
    expect(result.laborCents).toBe(5000);
  });
});

describe("priceRequest — route-aware costing", () => {
  it("bills vehicle on incremental miles and applies the density credit", () => {
    const result = priceRequest(
      { ...request, routed: true, incrementalMiles: 6 },
      policy,
      rateCard
    );
    expect(result.billableMiles).toBe(6);
    expect(result.vehicleCents).toBe(390);
    const credit = result.components.find((c) => c.code === "ROUTE_DENSITY_CREDIT");
    expect(credit?.amountCents).toBeLessThan(0);
    expect(result.finalCents).toBe(20866);
  });

  it("never lets the density credit push a price below the floor", () => {
    const result = priceRequest(
      { ...request, routed: true, incrementalMiles: 6 },
      { ...policy, routeDensityCreditPercent: 95 },
      rateCard
    );
    expect(result.finalCents).toBe(result.floorCents);
    expect(result.finalCents as number).toBeGreaterThanOrEqual(
      result.breakEvenCents as number
    );
  });
});

describe("priceRequest — NOT_CONFIGURED is an answer, not an error", () => {
  it("names a missing flat rate for the job's band", () => {
    const result = priceRequest(request, policy, {
      ...rateCard,
      contractorFlatByBandCents: { NEAR: null },
    });
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.missingConfiguration).toContain("contractorFlatRate:NEAR");
    expect(result.finalCents).toBeNull();
  });

  it("names a missing hourly rate", () => {
    const result = priceRequest(
      { ...request, compensationType: "staff_hourly" },
      policy,
      { ...rateCard, staffHourlyRateCents: null }
    );
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.missingConfiguration).toContain("staffHourlyRate");
  });

  it("names a missing vehicle rate and a missing target margin", () => {
    const result = priceRequest(
      request,
      { ...policy, targetMarginPercent: null },
      { ...rateCard, vehiclePerMileCents: null }
    );
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.missingConfiguration).toContain("vehiclePerMileRate");
    expect(result.missingConfiguration).toContain("targetMarginPercent");
  });

  it("treats an impossible margin (>= 100% after fees) as not configured", () => {
    const result = priceRequest(
      request,
      { ...policy, targetMarginPercent: 99 },
      rateCard
    );
    expect(result.status).toBe("NOT_CONFIGURED");
    expect(result.missingConfiguration).toContain("targetMarginPercent");
  });

  it("excludes unconfigured optional costs visibly instead of zeroing them silently", () => {
    const result = priceRequest(request, policy, {
      ...rateCard,
      consumablesCents: null,
      failureAllowanceCents: null,
    });
    expect(result.status).toBe("AUTO_PRICED");
    expect(result.excludedComponents).toEqual(["consumables", "failureAllowance"]);
    expect(result.otherCostCents).toBe(3500);
    expect(result.confidence).toBe("medium");
  });
});

describe("priceRequest — review gates and floors", () => {
  it("routes prices above the auto-approval ceiling to review, price intact", () => {
    const result = priceRequest(
      request,
      { ...policy, autoApprovalCeilingCents: 20000 },
      rateCard
    );
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.reviewReasons).toContain("ABOVE_AUTO_APPROVAL_CEILING");
    expect(result.finalCents).toBe(26773);
  });

  it("routes white-glove complexity to review", () => {
    const result = priceRequest(
      { ...request, complexity: "white_glove" },
      policy,
      rateCard
    );
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.reviewReasons).toContain("WHITE_GLOVE_COMPLEXITY");
  });

  it("enforces the minimum-contribution floor on small jobs", () => {
    const small = priceRequest(
      { ...request, roundTripMiles: 2, estimatedShopMinutes: 10 },
      policy,
      {
        ...rateCard,
        contractorFlatByBandCents: { LOCAL: 500 },
        supportAllowanceCents: 500,
        consumablesCents: null,
        failureAllowanceCents: null,
      }
    );
    // The 50%-margin target on this tiny job would contribute only
    // ~$12 — the $25 minimum-contribution floor binds instead.
    expect(small.finalCents).toBe(small.floorCents);
    expect(small.predictedContributionCents as number).toBeGreaterThanOrEqual(2500);
  });

  it("applies urgency and scarcity modifiers as itemized components", () => {
    const result = priceRequest(
      { ...request, urgency: "rush", slotScarcity: "tight" },
      policy,
      rateCard
    );
    const codes = result.components.map((c) => c.code);
    expect(codes).toContain("URGENCY");
    expect(codes).toContain("SCARCITY");
    expect(result.finalCents as number).toBeGreaterThan(26773);
  });

  it("rounds the final price up to the policy increment, never below the floor", () => {
    const result = priceRequest(
      request,
      { ...policy, roundUpToCents: 100 },
      rateCard
    );
    expect((result.finalCents as number) % 100).toBe(0);
    expect(result.finalCents as number).toBeGreaterThanOrEqual(
      result.floorCents as number
    );
  });
});
