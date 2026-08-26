export type PricingRule = {
  baseFeeCents: number;
  perMileCents: number;
  minFeeCents: number | null;
  /** Customer-facing name, e.g. "Rural Route Service". Resolved to a
   *  generic fallback in the repository if the rule row has none set. */
  serviceLabel: string;
};

/** Shown to the customer when a rule has no explicit serviceLabel. */
export const DEFAULT_SERVICE_LABEL = "City2Ranch Rural Route Service";

export type PriceBreakdown = {
  baseFeeCents: number;
  mileageFeeCents: number;
  totalCents: number;
};

/**
 * Pure calculation — no DB, no customer input beyond a ZIP-derived
 * mileage figure the customer never enters directly (see
 * src/lib/pricing/repository.ts). The only place a City Pickup order's
 * price is computed; snapshotted onto the order row at request time so a
 * later pricing_rules change never alters a historical order.
 */
export function computePrice(
  rule: PricingRule,
  roundTripMiles: number
): PriceBreakdown {
  const baseFeeCents = rule.baseFeeCents;
  const mileageFeeCents = Math.round(rule.perMileCents * roundTripMiles);
  const rawTotal = baseFeeCents + mileageFeeCents;
  const totalCents =
    rule.minFeeCents != null ? Math.max(rawTotal, rule.minFeeCents) : rawTotal;

  // Note: if the minimum-fee floor applies, totalCents can exceed
  // baseFeeCents + mileageFeeCents — the breakdown always shows the true
  // components, not components force-adjusted to sum to the floor.
  return { baseFeeCents, mileageFeeCents, totalCents };
}
