/**
 * Membership pricing — confirmed by the business (2026-08-28 launch
 * strategy): Route $59/mo, Private $149/mo, Estate $399/mo. Kept
 * separate from src/lib/constants.ts's SERVICE_TIERS (which has no
 * price field — it backs the public marketing/lead-capture pages,
 * which don't quote a specific membership price) even though the
 * `tier` keys are deliberately identical strings so the two can be
 * joined for display without a lookup table.
 *
 * Real Stripe Price objects must exist in the Stripe dashboard for
 * these tiers, with their ids in STRIPE_PRICE_ROUTE/PRIVATE/ESTATE —
 * see membershipServicesConfigured() in src/lib/env.ts. Prices are
 * looked up by id, not created inline (unlike approve-and-pay.ts's
 * one-off orders), because a recurring subscription Price is a real
 * Stripe object with its own billing-interval configuration, not
 * something Checkout can improvise per-session the way price_data can
 * for a one-time charge.
 */
export type MembershipTier = "route" | "private" | "estate";

export const MEMBERSHIP_TIERS: readonly { tier: MembershipTier; name: string; monthlyCents: number }[] = [
  { tier: "route", name: "Route", monthlyCents: 5900 },
  { tier: "private", name: "Private", monthlyCents: 14900 },
  { tier: "estate", name: "Estate", monthlyCents: 39900 },
];

const TIER_PRICE_ENV_VAR: Record<MembershipTier, string> = {
  route: "STRIPE_PRICE_ROUTE",
  private: "STRIPE_PRICE_PRIVATE",
  estate: "STRIPE_PRICE_ESTATE",
};

export function getMembershipPriceId(tier: MembershipTier): string | undefined {
  return process.env[TIER_PRICE_ENV_VAR[tier]];
}

/** Reverse lookup for the webhook, which only gets a Stripe price id
 *  back from the subscription object, not our tier name. */
export function getMembershipTierForPriceId(priceId: string): MembershipTier | undefined {
  return MEMBERSHIP_TIERS.find((t) => getMembershipPriceId(t.tier) === priceId)?.tier;
}
