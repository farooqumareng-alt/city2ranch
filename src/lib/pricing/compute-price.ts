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

// ---------------------------------------------------------------------
// Pricing Engine Phase 1 (2026-09-15) — the cost side. Everything above
// this line (PricingRule/computePrice) is what the CUSTOMER is charged
// and is completely untouched by Phase 1; everything below is what it
// actually COSTS City2Ranch to fulfill, used only to judge whether a
// price clears real economic floors. See schema.ts's doc comment on
// pricing_rules' cost columns and orders' snapshot columns.
// ---------------------------------------------------------------------

/**
 * Real cost inputs, separate from PricingRule above. Every field is
 * nullable, and null always means "not configured" — never treated as
 * $0 or 0% by any function below. Converting missing data into an
 * invented number is exactly what this engine must never do.
 */
export type CostConfig = {
  contractorFlatCostCents: number | null;
  contractorPerMileCostCents: number | null;
  sustainableCostAllowanceCents: number | null;
  /** A whole-number percent, e.g. 40 for 40% — not a fraction. */
  targetMarginPercent: number | null;
};

/**
 * Every economic value below either has a real number or doesn't exist
 * yet — there's no third option and no default. `{ status:
 * "not_configured" }` is not an error; it's the correct, honest answer
 * to "what does this cost" when the business hasn't told the system
 * yet.
 */
export type EconomicValue = { status: "available"; cents: number } | { status: "not_configured" };

/**
 * Layer 1 (Hard Cost Floor): the minimum economically required price —
 * actual incremental fulfillment cost, nothing else. Requires BOTH the
 * flat and per-mile contractor cost to be configured, not just one — a
 * missing per-mile rate is not the same as a $0 per-mile rate, and
 * silently treating it as zero would itself be inventing a number.
 */
export function computeHardCost(config: CostConfig, roundTripMiles: number): EconomicValue {
  if (config.contractorFlatCostCents == null || config.contractorPerMileCostCents == null) {
    return { status: "not_configured" };
  }
  const cents = config.contractorFlatCostCents + Math.round(config.contractorPerMileCostCents * roundTripMiles);
  return { status: "available", cents };
}

/**
 * Layer 2 (Sustainable Operating Floor): hard cost plus an explicitly
 * configured sustainable-operating allowance — never an invented
 * overhead-allocation methodology. Propagates "not_configured" from
 * either the hard cost itself or a missing allowance.
 */
export function computeSustainableFloor(hardCost: EconomicValue, config: CostConfig): EconomicValue {
  if (hardCost.status === "not_configured" || config.sustainableCostAllowanceCents == null) {
    return { status: "not_configured" };
  }
  return { status: "available", cents: hardCost.cents + config.sustainableCostAllowanceCents };
}

/**
 * Layer 3 (Target Profit Price): the price required to hit the
 * configured target MARGIN, not markup — targetProfitPrice =
 * sustainableCost / (1 - margin). A 40% margin on a $60 sustainable
 * cost is $100 ($60 / 0.60), not $84 ($60 × 1.40 — a 40% markup, and
 * only a 28.57% margin). A margin of 0% or ≥100% has no valid price
 * (division by zero or a negative result), so it's treated the same as
 * unconfigured rather than producing Infinity or a negative number.
 */
export function computeTargetProfitPrice(sustainableFloor: EconomicValue, config: CostConfig): EconomicValue {
  if (sustainableFloor.status === "not_configured" || config.targetMarginPercent == null) {
    return { status: "not_configured" };
  }
  if (config.targetMarginPercent <= 0 || config.targetMarginPercent >= 100) {
    return { status: "not_configured" };
  }
  const marginFraction = config.targetMarginPercent / 100;
  const cents = Math.round(sustainableFloor.cents / (1 - marginFraction));
  return { status: "available", cents };
}

export type PricingOutcome = "STANDARD_PRICE" | "STAFF_REVIEW" | "NOT_ECONOMICALLY_VIABLE";

export type PricingEvaluation = {
  outcome: PricingOutcome;
  /** Whether the proposed price is below the target-profit price — null
   *  when that price isn't configured. A warning flag, not a rejection:
   *  a below-target quote can still be sent if the outcome checks below
   *  don't block it — missing the target doesn't automatically mean the
   *  order must be rejected. */
  belowTargetProfit: boolean | null;
};

/**
 * The one place a proposed price is judged against real configured
 * economics. Missing cost configuration is itself a reason to route to
 * a human (STAFF_REVIEW), never a reason to skip the check or assume
 * the price is fine.
 */
export function evaluatePricingOutcome(
  proposedPriceCents: number,
  hardCost: EconomicValue,
  sustainableFloor: EconomicValue,
  targetProfitPrice: EconomicValue
): PricingEvaluation {
  const belowTargetProfit =
    targetProfitPrice.status === "available" ? proposedPriceCents < targetProfitPrice.cents : null;

  if (hardCost.status === "not_configured" || sustainableFloor.status === "not_configured") {
    return { outcome: "STAFF_REVIEW", belowTargetProfit };
  }
  if (proposedPriceCents < hardCost.cents) {
    return { outcome: "NOT_ECONOMICALLY_VIABLE", belowTargetProfit };
  }
  if (proposedPriceCents < sustainableFloor.cents) {
    return { outcome: "STAFF_REVIEW", belowTargetProfit };
  }
  return { outcome: "STANDARD_PRICE", belowTargetProfit };
}
