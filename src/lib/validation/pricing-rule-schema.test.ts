import { describe, expect, it } from "vitest";
import { pricingRuleSchema, pricingRuleUpdateSchema } from "./schemas";

/**
 * Build 2 (2026-11-04) validation coverage: the $0 price guard
 * (QA-011), the Stripe fee pairing rule (PRC-05), and threshold zone
 * fields (a zone needs a start, never a max). Inputs are form-style
 * strings, exactly as pricing-management.ts passes them.
 */
function input(overrides: Record<string, string | undefined> = {}) {
  return {
    serviceType: "concierge",
    serviceLabel: "Rural Route Service",
    baseFeeCents: "89.00",
    perMileCents: "1.99",
    minFeeCents: undefined,
    note: undefined,
    contractorFlatCostCents: undefined,
    contractorPerMileCostCents: undefined,
    sustainableCostAllowanceCents: undefined,
    targetMarginPercent: undefined,
    stripeFeePercent: undefined,
    stripeFeeFixedCents: undefined,
    zoneKey: undefined,
    zoneLabel: undefined,
    zoneMinMiles: undefined,
    ...overrides,
  };
}

describe("pricingRuleSchema — $0 guard (QA-011)", () => {
  it("rejects base $0 + per-mile $0 + no minimum (every price would be $0)", () => {
    const result = pricingRuleSchema.safeParse(input({ baseFeeCents: "0", perMileCents: "0" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("price every trip at $0"))).toBe(true);
    }
  });

  it("rejects an explicit $0 minimum the same way", () => {
    const result = pricingRuleSchema.safeParse(
      input({ baseFeeCents: "0.00", perMileCents: "0.00", minFeeCents: "0.00" })
    );
    expect(result.success).toBe(false);
  });

  it("allows $0 base and per-mile when a real minimum fee carries the price", () => {
    const result = pricingRuleSchema.safeParse(
      input({ baseFeeCents: "0", perMileCents: "0", minFeeCents: "25.00" })
    );
    expect(result.success).toBe(true);
  });

  it("applies the same guard on the update schema", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- serviceType is create-only; the update schema omits it
    const { serviceType: _serviceType, ...updateInput } = input({ baseFeeCents: "0", perMileCents: "0" });
    expect(pricingRuleUpdateSchema.safeParse(updateInput).success).toBe(false);
  });
});

describe("pricingRuleSchema — Stripe fee pairing (PRC-05)", () => {
  it("rejects a percent with no fixed fee (half a fee schedule)", () => {
    expect(pricingRuleSchema.safeParse(input({ stripeFeePercent: "2.9" })).success).toBe(false);
    expect(pricingRuleSchema.safeParse(input({ stripeFeeFixedCents: "0.30" })).success).toBe(false);
  });

  it("accepts both set, and both blank", () => {
    expect(
      pricingRuleSchema.safeParse(input({ stripeFeePercent: "2.9", stripeFeeFixedCents: "0.30" })).success
    ).toBe(true);
    expect(pricingRuleSchema.safeParse(input()).success).toBe(true);
  });
});

describe("pricingRuleSchema — threshold zones", () => {
  it("accepts a zone defined by key, label and starting miles only (no maximum exists anymore)", () => {
    const result = pricingRuleSchema.safeParse(
      input({ zoneKey: "near", zoneLabel: "Near Service", zoneMinMiles: "20" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zoneMinMiles).toBe(20);
    }
  });

  it("still requires the starting miles once any zone field is set", () => {
    const result = pricingRuleSchema.safeParse(input({ zoneKey: "near", zoneLabel: "Near Service" }));
    expect(result.success).toBe(false);
  });
});
