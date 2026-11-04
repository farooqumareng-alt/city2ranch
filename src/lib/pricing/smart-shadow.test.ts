import { describe, expect, it } from "vitest";
import {
  priceRequest,
  type SmartPolicy,
  type SmartPriceRequest,
  type SmartRateCard,
} from "./smart-engine";
import {
  buildQuoteInsert,
  isSmartShadowEnabled,
  policyFromRow,
  rateCardFromRow,
} from "./smart-shadow";

describe("isSmartShadowEnabled", () => {
  it("is off by default and only on with an explicit 1", () => {
    expect(isSmartShadowEnabled({})).toBe(false);
    expect(isSmartShadowEnabled({ PRICING_ENGINE_SHADOW: "0" })).toBe(false);
    expect(isSmartShadowEnabled({ PRICING_ENGINE_SHADOW: "true" })).toBe(false);
    expect(isSmartShadowEnabled({ PRICING_ENGINE_SHADOW: "1" })).toBe(true);
  });
});

const policyRow = {
  id: "00000000-0000-0000-0000-000000000001",
  createdAt: new Date("2026-11-04T00:00:00Z"),
  version: "policy-1",
  isActive: true,
  targetMarginPercent: "50.00",
  minContributionCents: 2500,
  minFeeCents: null,
  autoApprovalCeilingCents: 100000,
  quoteExpiryMinutes: 4320,
  roundUpToCents: null,
  urgencyPriorityPercent: "10.00",
  urgencyRushPercent: "25.00",
  scarcityTightPercent: null,
  scarcityScarcePercent: null,
  complexityComplexPercent: "15.00",
  scheduleOffHoursPercent: null,
  routeDensityCreditPercent: "10.00",
  note: null,
} as Parameters<typeof policyFromRow>[0];

const rateCardRow = {
  id: "00000000-0000-0000-0000-000000000002",
  createdAt: new Date("2026-11-04T00:00:00Z"),
  version: "rates-1",
  isActive: true,
  contractorFlatLocalCents: 4000,
  contractorFlatNearCents: 6000,
  contractorFlatExtendedCents: null,
  contractorFlatRemoteCents: null,
  contractorFlatEstateRuralCents: null,
  staffHourlyRateCents: 2500,
  vehiclePerMileCents: 65,
  supportAllowanceCents: 3500,
  consumablesCents: null,
  failureAllowanceCents: null,
  stripePercent: "2.900",
  stripeFixedCents: 30,
  note: null,
} as Parameters<typeof rateCardFromRow>[0];

describe("policyFromRow / rateCardFromRow", () => {
  it("converts numeric strings to numbers and preserves nulls", () => {
    const policy = policyFromRow(policyRow);
    expect(policy.targetMarginPercent).toBe(50);
    expect(policy.urgencyRushPercent).toBe(25);
    expect(policy.scarcityTightPercent).toBeNull();
    expect(policy.quoteExpiryMinutes).toBe(4320);
  });

  it("maps the flat schedule by band and keeps unconfigured bands null", () => {
    const rateCard = rateCardFromRow(rateCardRow);
    expect(rateCard.contractorFlatByBandCents?.NEAR).toBe(6000);
    expect(rateCard.contractorFlatByBandCents?.EXTENDED).toBeNull();
    expect(rateCard.stripePercent).toBe(2.9);
    expect(rateCard.stripeFixedCents).toBe(30);
  });
});

describe("buildQuoteInsert", () => {
  it("stores the engine result as a shadow quote record", () => {
    const policy: SmartPolicy = policyFromRow(policyRow);
    const rateCard: SmartRateCard = rateCardFromRow(rateCardRow);
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
    const result = priceRequest(request, policy, rateCard);
    const insert = buildQuoteInsert(result, request, null);

    expect(insert.mode).toBe("shadow");
    expect(insert.status).toBe("AUTO_PRICED");
    expect(insert.finalCents).toBe(result.finalCents);
    expect(insert.band).toBe("NEAR");
    expect(insert.expiresAt).toEqual(new Date("2026-11-07T12:00:00.000Z"));
    expect(insert.orderId).toBeNull();
  });
});
