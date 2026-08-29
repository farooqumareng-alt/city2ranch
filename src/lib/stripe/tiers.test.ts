import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMembershipPriceId, getMembershipTierForPriceId, MEMBERSHIP_TIERS } from "./tiers";

const ENV_VARS = ["STRIPE_PRICE_ROUTE", "STRIPE_PRICE_PRIVATE", "STRIPE_PRICE_ESTATE"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_VARS) originalEnv[key] = process.env[key];
  process.env.STRIPE_PRICE_ROUTE = "price_route_123";
  process.env.STRIPE_PRICE_PRIVATE = "price_private_123";
  process.env.STRIPE_PRICE_ESTATE = "price_estate_123";
});

afterEach(() => {
  for (const key of ENV_VARS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("getMembershipPriceId / getMembershipTierForPriceId", () => {
  it("round-trips every tier through its configured price id", () => {
    for (const { tier } of MEMBERSHIP_TIERS) {
      const priceId = getMembershipPriceId(tier);
      expect(priceId).toBeTruthy();
      expect(getMembershipTierForPriceId(priceId!)).toBe(tier);
    }
  });

  it("returns undefined for a price id that matches no configured tier", () => {
    expect(getMembershipTierForPriceId("price_unknown")).toBeUndefined();
  });

  it("returns undefined when a tier's env var isn't set", () => {
    delete process.env.STRIPE_PRICE_ROUTE;
    expect(getMembershipPriceId("route")).toBeUndefined();
  });
});
