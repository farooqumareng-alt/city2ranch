import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { pricingPolicies, pricingQuotes, pricingRateCards } from "../db/schema";
import {
  priceRequest,
  type SmartPolicy,
  type SmartPriceRequest,
  type SmartPriceResult,
  type SmartRateCard,
} from "./smart-engine";

/**
 * Smart Pricing Engine — shadow mode (Phase A).
 *
 * Shadow mode means: the engine CALCULATES alongside the live pricing
 * process and stores its result in pricing_quotes for comparison —
 * and nothing else. It never sets, changes, or influences a price a
 * customer sees or pays. The live process (computePrice / staff fee
 * lines) remains the only source of charged prices until a later
 * phase is explicitly approved.
 *
 * Two independent safety properties:
 *  1. The recorder is behind PRICING_ENGINE_SHADOW=1 and defaults
 *     OFF — deploying this code changes no behavior at all.
 *  2. recordShadowQuote NEVER throws. A shadow calculation that
 *     failed must not be able to break a real order; failures are
 *     logged and reported in the return value, nothing more.
 *
 * Integration point (Phase A wiring, when deployment is approved):
 * call recordShadowQuote after an order's price is finalized by the
 * EXISTING process, passing the same request facts. It is deliberately
 * not called from any charging path in this phase.
 */

export function isSmartShadowEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.PRICING_ENGINE_SHADOW === "1";
}

type PolicyRow = typeof pricingPolicies.$inferSelect;
type RateCardRow = typeof pricingRateCards.$inferSelect;

function num(value: string | number | null): number | null {
  return value == null ? null : Number(value);
}

/** Pure row → engine-policy mapping (numeric columns arrive as
 *  strings from Drizzle). Exported for tests. */
export function policyFromRow(row: PolicyRow): SmartPolicy {
  return {
    version: row.version,
    targetMarginPercent: num(row.targetMarginPercent),
    minContributionCents: row.minContributionCents,
    minFeeCents: row.minFeeCents,
    autoApprovalCeilingCents: row.autoApprovalCeilingCents,
    quoteExpiryMinutes: row.quoteExpiryMinutes,
    roundUpToCents: row.roundUpToCents,
    urgencyPriorityPercent: num(row.urgencyPriorityPercent),
    urgencyRushPercent: num(row.urgencyRushPercent),
    scarcityTightPercent: num(row.scarcityTightPercent),
    scarcityScarcePercent: num(row.scarcityScarcePercent),
    complexityComplexPercent: num(row.complexityComplexPercent),
    scheduleOffHoursPercent: num(row.scheduleOffHoursPercent),
    routeDensityCreditPercent: num(row.routeDensityCreditPercent),
  };
}

/** Pure row → engine-rate-card mapping. Exported for tests. */
export function rateCardFromRow(row: RateCardRow): SmartRateCard {
  return {
    version: row.version,
    contractorFlatByBandCents: {
      LOCAL: row.contractorFlatLocalCents,
      NEAR: row.contractorFlatNearCents,
      EXTENDED: row.contractorFlatExtendedCents,
      REMOTE: row.contractorFlatRemoteCents,
      ESTATE_RURAL: row.contractorFlatEstateRuralCents,
    },
    staffHourlyRateCents: row.staffHourlyRateCents,
    vehiclePerMileCents: row.vehiclePerMileCents,
    supportAllowanceCents: row.supportAllowanceCents,
    consumablesCents: row.consumablesCents,
    failureAllowanceCents: row.failureAllowanceCents,
    stripePercent: Number(row.stripePercent),
    stripeFixedCents: row.stripeFixedCents,
  };
}

/** Pure mapping from an engine result to the pricing_quotes insert.
 *  Exported for tests — this is the exact shape that lands in the
 *  table, so a test here is a test of the stored record. */
export function buildQuoteInsert(
  result: SmartPriceResult,
  request: SmartPriceRequest,
  orderId: string | null
): typeof pricingQuotes.$inferInsert {
  return {
    orderId,
    mode: "shadow",
    status: result.status,
    engineVersion: result.engineVersion,
    policyVersion: result.policyVersion,
    rateCardVersion: result.rateCardVersion,
    band: result.band,
    requestSnapshot: { ...request, requestedAt: request.requestedAt.toISOString() },
    components: result.components,
    directCostCents: result.directCostCents,
    breakEvenCents: result.breakEvenCents,
    targetCents: result.targetCents,
    floorCents: result.floorCents,
    finalCents: result.finalCents,
    predictedContributionCents: result.predictedContributionCents,
    confidence: result.confidence,
    explanation: result.explanation,
    expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
    supersededById: null,
  };
}

export type ShadowOutcome =
  | { recorded: true; result: SmartPriceResult }
  | {
      recorded: false;
      reason: "disabled" | "no_active_policy" | "no_active_rate_card" | "error";
      error?: unknown;
    };

/**
 * Runs the engine for a request and stores the result as a shadow
 * quote. Returns a ShadowOutcome instead of throwing — see the file
 * header for why. With no active policy or rate card rows (the Phase
 * A starting state everywhere), it records nothing and says why.
 */
export async function recordShadowQuote(input: {
  orderId: string | null;
  request: SmartPriceRequest;
}): Promise<ShadowOutcome> {
  if (!isSmartShadowEnabled()) {
    return { recorded: false, reason: "disabled" };
  }
  try {
    const db = getDb();
    const [policyRow] = await db
      .select()
      .from(pricingPolicies)
      .where(eq(pricingPolicies.isActive, true))
      .limit(1);
    if (!policyRow) return { recorded: false, reason: "no_active_policy" };

    const [rateCardRow] = await db
      .select()
      .from(pricingRateCards)
      .where(eq(pricingRateCards.isActive, true))
      .limit(1);
    if (!rateCardRow) return { recorded: false, reason: "no_active_rate_card" };

    const result = priceRequest(
      input.request,
      policyFromRow(policyRow),
      rateCardFromRow(rateCardRow)
    );
    await db
      .insert(pricingQuotes)
      .values(buildQuoteInsert(result, input.request, input.orderId));
    return { recorded: true, result };
  } catch (error) {
    console.error("smart pricing shadow quote failed", error);
    return { recorded: false, reason: "error", error };
  }
}
