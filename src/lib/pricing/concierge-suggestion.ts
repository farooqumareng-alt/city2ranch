import { getActivePricingRuleOrNull, getZipMileage } from "@/lib/pricing/repository";
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
};

/**
 * The one place a Concierge order's suggested price and full economic
 * evaluation are computed — called both by the order detail page (to
 * show staff the suggestion before they build a quote) and by
 * finalizeConciergeQuote() (to snapshot the same evaluation onto the
 * order, recomputed server-side at the moment of finalizing rather
 * than trusting whatever the client last rendered).
 *
 * Returns null when there's no active Concierge pricing rule or no
 * mileage data for this ZIP — the caller's job is to fall back to
 * today's plain manual quote workflow in that case (see
 * ConciergeQuoteForm.tsx), never to fabricate a suggestion from
 * incomplete configuration.
 */
export async function getConciergeSuggestion(deliveryZip: string): Promise<ConciergeSuggestion | null> {
  const [rule, roundTripMiles] = await Promise.all([
    getActivePricingRuleOrNull("concierge"),
    getZipMileage(deliveryZip),
  ]);
  if (!rule || roundTripMiles == null) return null;

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
  };
}
