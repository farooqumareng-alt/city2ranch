import { describe, expect, it } from "vitest";
import {
  computePrice,
  computeHardCost,
  computeSustainableFloor,
  computeTargetProfitPrice,
  evaluatePricingOutcome,
  type CostConfig,
} from "./compute-price";

describe("computePrice", () => {
  it("computes base + mileage with no floor", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: null, serviceLabel: "Rural Route Service" },
      25
    );
    expect(result).toEqual({
      baseFeeCents: 1500,
      mileageFeeCents: 3750,
      totalCents: 5250,
    });
  });

  it("rounds a fractional mileage fee to the nearest cent", () => {
    const result = computePrice(
      { baseFeeCents: 1000, perMileCents: 133, minFeeCents: null, serviceLabel: "Rural Route Service" },
      10.4
    );
    // 133 * 10.4 = 1383.2 -> rounds to 1383
    expect(result.mileageFeeCents).toBe(1383);
    expect(result.totalCents).toBe(2383);
  });

  it("applies the minimum-fee floor when base + mileage falls short", () => {
    const result = computePrice(
      { baseFeeCents: 500, perMileCents: 50, minFeeCents: 2500, serviceLabel: "Rural Route Service" },
      2
    );
    // base 500 + mileage 100 = 600, below the 2500 floor
    expect(result.baseFeeCents).toBe(500);
    expect(result.mileageFeeCents).toBe(100);
    expect(result.totalCents).toBe(2500);
  });

  it("does not apply the floor when it's already exceeded", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: 2500, serviceLabel: "Rural Route Service" },
      25
    );
    expect(result.totalCents).toBe(5250);
  });

  it("treats zero miles as base fee only", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: null, serviceLabel: "Rural Route Service" },
      0
    );
    expect(result).toEqual({
      baseFeeCents: 1500,
      mileageFeeCents: 0,
      totalCents: 1500,
    });
  });
});

// ---------------------------------------------------------------------
// Pricing Engine Phase 1 — the cost side. Approved test requirements:
// margin (not markup) math, hard-cost/sustainable-floor violations,
// missing configuration never becoming zero, and the full outcome
// evaluation.
// ---------------------------------------------------------------------

const NOT_CONFIGURED: CostConfig = {
  contractorFlatCostCents: null,
  contractorPerMileCostCents: null,
  sustainableCostAllowanceCents: null,
  targetMarginPercent: null,
};

describe("computeHardCost", () => {
  it("sums flat + (per-mile × miles) when both are configured", () => {
    const config: CostConfig = { ...NOT_CONFIGURED, contractorFlatCostCents: 1000, contractorPerMileCostCents: 100 };
    expect(computeHardCost(config, 10)).toEqual({ status: "available", cents: 2000 });
  });

  it("is not_configured when the flat cost is missing, even if per-mile is set", () => {
    const config: CostConfig = { ...NOT_CONFIGURED, contractorPerMileCostCents: 100 };
    expect(computeHardCost(config, 10)).toEqual({ status: "not_configured" });
  });

  it("is not_configured when the per-mile cost is missing, even if flat is set", () => {
    const config: CostConfig = { ...NOT_CONFIGURED, contractorFlatCostCents: 1000 };
    expect(computeHardCost(config, 10)).toEqual({ status: "not_configured" });
  });

  it("is not_configured when neither cost is set — never treated as $0", () => {
    expect(computeHardCost(NOT_CONFIGURED, 10)).toEqual({ status: "not_configured" });
  });

  it("rounds a fractional mileage cost to the nearest cent", () => {
    const config: CostConfig = { ...NOT_CONFIGURED, contractorFlatCostCents: 0, contractorPerMileCostCents: 133 };
    // 133 * 10.4 = 1383.2 -> rounds to 1383
    expect(computeHardCost(config, 10.4)).toEqual({ status: "available", cents: 1383 });
  });
});

describe("computeSustainableFloor", () => {
  const configuredCost: CostConfig = {
    ...NOT_CONFIGURED,
    contractorFlatCostCents: 1000,
    contractorPerMileCostCents: 100,
  };

  it("adds the sustainable-cost allowance on top of hard cost", () => {
    const hardCost = computeHardCost(configuredCost, 10); // 2000
    const config: CostConfig = { ...configuredCost, sustainableCostAllowanceCents: 500 };
    expect(computeSustainableFloor(hardCost, config)).toEqual({ status: "available", cents: 2500 });
  });

  it("is not_configured when hard cost itself is not_configured", () => {
    const hardCost = computeHardCost(NOT_CONFIGURED, 10);
    const config: CostConfig = { ...NOT_CONFIGURED, sustainableCostAllowanceCents: 500 };
    expect(computeSustainableFloor(hardCost, config)).toEqual({ status: "not_configured" });
  });

  it("is not_configured when the allowance itself is missing, even with a real hard cost", () => {
    const hardCost = computeHardCost(configuredCost, 10);
    expect(computeSustainableFloor(hardCost, configuredCost)).toEqual({ status: "not_configured" });
  });
});

describe("computeTargetProfitPrice", () => {
  it("computes a true 40% MARGIN, not a 40% markup — the approved worked example", () => {
    // Sustainable cost = $60, target margin = 40% -> target price = $100
    // (NOT $60 * 1.40 = $84, which is a 40% markup / 28.57% margin).
    const sustainableFloor: ReturnType<typeof computeSustainableFloor> = { status: "available", cents: 6000 };
    const config: CostConfig = { ...NOT_CONFIGURED, targetMarginPercent: 40 };
    const result = computeTargetProfitPrice(sustainableFloor, config);
    expect(result).toEqual({ status: "available", cents: 10000 });
  });

  it("is not_configured when the sustainable floor is not_configured", () => {
    const config: CostConfig = { ...NOT_CONFIGURED, targetMarginPercent: 40 };
    expect(computeTargetProfitPrice({ status: "not_configured" }, config)).toEqual({ status: "not_configured" });
  });

  it("is not_configured when no target margin is set — never assumes 40%", () => {
    const sustainableFloor: ReturnType<typeof computeSustainableFloor> = { status: "available", cents: 6000 };
    expect(computeTargetProfitPrice(sustainableFloor, NOT_CONFIGURED)).toEqual({ status: "not_configured" });
  });

  it("treats a 0% or ≥100% margin as not_configured rather than dividing by zero or going negative", () => {
    const sustainableFloor: ReturnType<typeof computeSustainableFloor> = { status: "available", cents: 6000 };
    expect(computeTargetProfitPrice(sustainableFloor, { ...NOT_CONFIGURED, targetMarginPercent: 0 })).toEqual({
      status: "not_configured",
    });
    expect(computeTargetProfitPrice(sustainableFloor, { ...NOT_CONFIGURED, targetMarginPercent: 100 })).toEqual({
      status: "not_configured",
    });
  });
});

describe("evaluatePricingOutcome", () => {
  const hardCost: ReturnType<typeof computeHardCost> = { status: "available", cents: 3200 };
  const sustainableFloor: ReturnType<typeof computeSustainableFloor> = { status: "available", cents: 4800 };
  const targetProfitPrice: ReturnType<typeof computeTargetProfitPrice> = { status: "available", cents: 8000 };

  it("returns STAFF_REVIEW when required cost inputs are missing — never fabricates a floor", () => {
    const result = evaluatePricingOutcome(9000, { status: "not_configured" }, { status: "not_configured" }, {
      status: "not_configured",
    });
    expect(result.outcome).toBe("STAFF_REVIEW");
    expect(result.belowTargetProfit).toBeNull();
  });

  it("returns NOT_ECONOMICALLY_VIABLE when the price is below the hard cost floor", () => {
    const result = evaluatePricingOutcome(3000, hardCost, sustainableFloor, targetProfitPrice);
    expect(result.outcome).toBe("NOT_ECONOMICALLY_VIABLE");
  });

  it("returns STAFF_REVIEW when the price clears hard cost but is below the sustainable floor", () => {
    const result = evaluatePricingOutcome(4000, hardCost, sustainableFloor, targetProfitPrice);
    expect(result.outcome).toBe("STAFF_REVIEW");
  });

  it("returns STANDARD_PRICE when the price clears the sustainable floor", () => {
    const result = evaluatePricingOutcome(8500, hardCost, sustainableFloor, targetProfitPrice);
    expect(result.outcome).toBe("STANDARD_PRICE");
  });

  it("flags belowTargetProfit as a warning without changing the outcome", () => {
    // Clears the sustainable floor (STANDARD_PRICE-eligible) but is
    // still short of the target-profit price — a real, legitimate
    // state per the approved spec (Check C: doesn't force rejection).
    const result = evaluatePricingOutcome(5000, hardCost, sustainableFloor, targetProfitPrice);
    expect(result.outcome).toBe("STANDARD_PRICE");
    expect(result.belowTargetProfit).toBe(true);
  });

  it("leaves belowTargetProfit null when no target margin is configured", () => {
    const result = evaluatePricingOutcome(8500, hardCost, sustainableFloor, { status: "not_configured" });
    expect(result.belowTargetProfit).toBeNull();
  });
});
