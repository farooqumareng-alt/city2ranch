import { getActivePricingRuleById, getActivePricingRuleForZone, getZipMileage } from "@/lib/pricing/repository";
import {
  computePrice,
  computeHardCost,
  computeSustainableFloor,
  computeTargetProfitPrice,
  evaluatePricingOutcome,
  type EconomicValue,
  type PricingOutcome,
} from "@/lib/pricing/compute-price";

export type ConciergeSuggestion = {
  pricingRuleId: string;
  roundTripMiles: number;
  serviceLabel: string;
  baseFeeCents: number;
  mileageFeeCents: number;
  suggestedTotalCents: number;
  hardCost: EconomicValue;
  sustainableFloor: EconomicValue;
  targetProfitPrice: EconomicValue;
  outcome: PricingOutcome;
  belowTargetProfit: boolean | null;
  // Phase 2 — set only when the matched rule is zoned (see
  // pricingRules.zoneLabel). This is the CUSTOMER-facing name the
  // quote should show instead of a mileage breakdown (see
  // ConciergeQuoteForm.tsx's fee-line pre-fill). Null for a plain
  // flat-rate rule, where today's base+mileage split is unchanged.
  zoneLabel: string | null;
};

/**
 * The one place a Concierge order's suggested price and full economic
 * evaluation are computed — called both by the order detail page (to
 * show staff the suggestion before they build a quote) and by
 * finalizeConciergeQuote() (to snapshot the same evaluation onto the
 * order, recomputed server-side at the moment of finalizing rather
 * than trusting whatever the client last rendered).
 *
 * Returns null when there's no active Concierge pricing rule matching
 * this ZIP's mileage (nothing configured at all, or the mileage falls
 * outside every configured zone — e.g. past the farthest zone's upper
 * bound) or no mileage data for this ZIP — the caller's job is to fall
 * back to today's plain manual quote workflow in that case (see
 * ConciergeQuoteForm.tsx), never to fabricate a suggestion from
 * incomplete configuration.
 *
 * Mileage is resolved before rule selection (Phase 2) — which rule
 * applies now depends on the ZIP's distance, not just the service
 * type, since a service can have several active zoned rules at once.
 *
 * `overrideRuleId` (optional, staff-facing manual zone override) lets
 * a caller ask for a *specific* active Concierge rule instead of the
 * mileage auto-match — e.g. a gated ranch property that's mileage-Near
 * but needs Estate-Rural handling. It's re-verified here server-side
 * (getActivePricingRuleById checks it's real, active, and Concierge)
 * before ever being used, exactly like every other pricing input in
 * this codebase — a submitted id is never trusted blindly. An override
 * id that turns out invalid (deactivated since the page loaded, wrong
 * service type, doesn't exist) silently falls back to auto-matching
 * rather than erroring, the same "never fabricate, degrade to the safe
 * default" posture as a missing rule or missing mileage.
 */
export async function getConciergeSuggestion(
  deliveryZip: string,
  overrideRuleId?: string
): Promise<ConciergeSuggestion | null> {
  const roundTripMiles = await getZipMileage(deliveryZip);
  if (roundTripMiles == null) return null;

  const rule = overrideRuleId
    ? (await getActivePricingRuleById(overrideRuleId, "concierge")) ??
      (await getActivePricingRuleForZone("concierge", roundTripMiles))
    : await getActivePricingRuleForZone("concierge", roundTripMiles);
  if (!rule) return null;

  const price = computePrice(rule, roundTripMiles);
  const hardCost = computeHardCost(rule, roundTripMiles);
  const sustainableFloor = computeSustainableFloor(hardCost, rule);
  const targetProfitPrice = computeTargetProfitPrice(sustainableFloor, rule);
  const { outcome, belowTargetProfit } = evaluatePricingOutcome(
    price.totalCents,
    hardCost,
    sustainableFloor,
    targetProfitPrice
  );

  return {
    pricingRuleId: rule.id,
    roundTripMiles,
    serviceLabel: rule.serviceLabel,
    baseFeeCents: price.baseFeeCents,
    mileageFeeCents: price.mileageFeeCents,
    suggestedTotalCents: price.totalCents,
    hardCost,
    sustainableFloor,
    targetProfitPrice,
    outcome,
    belowTargetProfit,
    zoneLabel: rule.zoneLabel,
  };
}
