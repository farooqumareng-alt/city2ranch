/**
 * Smart Pricing Engine (SPE) v1 — Phase A core.
 *
 * Spec: docs/CITY2RANCH_SMART_PRICING_ENGINE_SPEC.md. The engine
 * generates a price for a request from the job itself — estimated
 * time, distance, complexity, route context — over a protected margin
 * floor, instead of looking up a static zone table or waiting for
 * staff to type fee lines. It is deterministic: same inputs + same
 * policy/rate-card versions ⇒ same price, every time. There is no
 * randomness, no clock access (the caller passes `requestedAt`), and
 * no LLM anywhere in this path.
 *
 * House rules inherited from compute-price.ts, unchanged:
 *  - A missing business value is NULL and means "not configured" —
 *    never $0, never a default, never an invented number. When a
 *    required input is missing the engine says so by name
 *    (status: "NOT_CONFIGURED") instead of producing a price.
 *  - Optional components the business hasn't configured (consumables,
 *    failure allowance) are EXCLUDED and reported in
 *    `excludedComponents` — visible, never silently zero.
 *  - Prices never vary by who the customer is. Inputs describe the
 *    job, the route, and the time — never the person.
 *
 * The configured zones survive here as BANDS: labor-schedule and
 * reporting categories derived from mileage thresholds the user chose
 * to keep (NEAR from 20, EXTENDED from 50, REMOTE from 90,
 * ESTATE_RURAL from 150). They no longer gate whether a price exists —
 * the price comes from the continuous cost curve below, so a sub-20
 * request prices as LOCAL instead of matching no zone at all.
 */

export const SMART_ENGINE_VERSION = "spe-1.0.0";

export type SmartBand = "LOCAL" | "NEAR" | "EXTENDED" | "REMOTE" | "ESTATE_RURAL";

/** Mileage thresholds (round-trip miles) for the bands the user chose
 *  to keep on 2026-11-04: [20,50) NEAR, [50,90) EXTENDED,
 *  [90,150) REMOTE, [150,∞) ESTATE_RURAL, below 20 LOCAL. Half-open
 *  intervals, so a fractional mileage (49.5) always lands in exactly
 *  one band — the fractional dead zones of the old inclusive matcher
 *  cannot recur here. */
export function bandForMiles(roundTripMiles: number): SmartBand {
  if (roundTripMiles < 20) return "LOCAL";
  if (roundTripMiles < 50) return "NEAR";
  if (roundTripMiles < 90) return "EXTENDED";
  if (roundTripMiles < 150) return "REMOTE";
  return "ESTATE_RURAL";
}

export type CompensationType = "contractor_flat" | "staff_hourly";

export type SmartServiceType = "pickup" | "concierge";

/**
 * What the business pays to fulfill work. Every field is nullable;
 * null = not configured. The 1099 flat schedule is keyed by band (a
 * flat amount per completed job, per the user's compensation
 * decision); full-time labor is an hourly rate the engine multiplies
 * by estimated paid minutes. Stripe's fee parameters live here too —
 * they are a real cost of every card payment and belong inside the
 * floor math, not outside it.
 */
export type SmartRateCard = {
  version: string;
  contractorFlatByBandCents: Partial<Record<SmartBand, number | null>> | null;
  staffHourlyRateCents: number | null;
  vehiclePerMileCents: number | null;
  supportAllowanceCents: number | null;
  consumablesCents: number | null;
  failureAllowanceCents: number | null;
  /** e.g. 2.9 for 2.9% — a whole-number percent, matching the
   *  targetMarginPercent convention in compute-price.ts. */
  stripePercent: number;
  stripeFixedCents: number;
};

/**
 * Business policy: how aggressively to price above the floor and when
 * a human must look. Modifier percents are whole-number percents
 * applied to the target price; null means "no adjustment configured"
 * (the engine applies none and says so if the request asked for that
 * tier). targetMarginPercent is required for a price to exist at all —
 * without it the engine knows the floor but not the business's price,
 * and guessing one would be inventing a number.
 */
export type SmartPolicy = {
  version: string;
  targetMarginPercent: number | null;
  minContributionCents: number | null;
  minFeeCents: number | null;
  autoApprovalCeilingCents: number | null;
  quoteExpiryMinutes: number;
  /** Round the final price UP to a multiple of this (e.g. 100 =
   *  whole dollars). Null = exact cents. Rounding is always up, so a
   *  rounded price can never fall below the floor. */
  roundUpToCents: number | null;
  urgencyPriorityPercent: number | null;
  urgencyRushPercent: number | null;
  scarcityTightPercent: number | null;
  scarcityScarcePercent: number | null;
  complexityComplexPercent: number | null;
  scheduleOffHoursPercent: number | null;
  /** A REDUCTION for a job that inserts cheaply into a route already
   *  traveling — funded by the genuinely lower incremental cost and
   *  always clamped at the floor. */
  routeDensityCreditPercent: number | null;
};

export type SmartPriceRequest = {
  serviceType: SmartServiceType;
  /** Dedicated-trip round-trip miles for the delivery ZIP (the
   *  zip_mileage figure today). Also determines the band. */
  roundTripMiles: number;
  /** When the job inserts into an existing route, the EXTRA miles it
   *  adds. Null = dedicated trip; billable miles fall back to
   *  roundTripMiles. */
  incrementalMiles: number | null;
  estimatedDriveMinutes: number;
  estimatedShopMinutes: number;
  estimatedWaitMinutes: number;
  compensationType: CompensationType;
  /** Stops beyond the first. */
  extraStops: number;
  /** Per-extra-stop minutes, estimated by the caller/operations. */
  minutesPerExtraStop: number;
  complexity: "standard" | "complex" | "white_glove";
  urgency: "scheduled" | "priority" | "rush";
  scheduleBand: "standard" | "off_hours";
  slotScarcity: "normal" | "tight" | "scarce";
  /** True when the job rides an existing route (density credit may
   *  apply and incremental miles are billable). */
  routed: boolean;
  /** Caller-supplied "now" — the engine never reads the clock, which
   *  is what makes a quote reproducible in tests and audits. */
  requestedAt: Date;
};

export type PriceComponent = {
  code: string;
  label: string;
  amountCents: number;
  basis: string;
};

export type SmartPriceStatus = "AUTO_PRICED" | "REVIEW_REQUIRED" | "NOT_CONFIGURED";

export type SmartPriceResult = {
  status: SmartPriceStatus;
  engineVersion: string;
  policyVersion: string;
  rateCardVersion: string;
  band: SmartBand;
  /** Required business values that are missing, named. Non-empty ⇒
   *  status NOT_CONFIGURED and every price field below is null. */
  missingConfiguration: string[];
  /** Optional cost components not configured and therefore excluded
   *  from the cost base — reported, never silently zero. */
  excludedComponents: string[];
  /** Why a human must review (price exists, but may not auto-send). */
  reviewReasons: string[];
  components: PriceComponent[];
  estimatedPaidMinutes: number | null;
  billableMiles: number | null;
  laborCents: number | null;
  vehicleCents: number | null;
  otherCostCents: number | null;
  directCostCents: number | null;
  breakEvenCents: number | null;
  targetCents: number | null;
  floorCents: number | null;
  finalCents: number | null;
  predictedContributionCents: number | null;
  /** Contribution as a percent of the final price, after fees. */
  predictedMarginPercent: number | null;
  confidence: "high" | "medium" | "low";
  explanation: string[];
  expiresAt: string | null;
};

function ceilDiv(numerator: number, denominator: number): number {
  return Math.ceil(numerator / denominator);
}

export function priceRequest(
  request: SmartPriceRequest,
  policy: SmartPolicy,
  rateCard: SmartRateCard
): SmartPriceResult {
  const band = bandForMiles(request.roundTripMiles);
  const explanation: string[] = [];
  const missing: string[] = [];
  const excluded: string[] = [];

  const paidMinutes =
    request.estimatedDriveMinutes +
    request.estimatedShopMinutes +
    request.estimatedWaitMinutes +
    request.extraStops * request.minutesPerExtraStop;

  const billableMiles =
    request.routed && request.incrementalMiles != null
      ? request.incrementalMiles
      : request.roundTripMiles;

  // --- Labor -------------------------------------------------------
  let laborCents: number | null = null;
  if (request.compensationType === "contractor_flat") {
    const flat = rateCard.contractorFlatByBandCents?.[band] ?? null;
    if (flat == null) {
      missing.push(`contractorFlatRate:${band}`);
    } else {
      laborCents = flat;
      explanation.push(
        `Labor: 1099 flat rate for ${band} band = $${(flat / 100).toFixed(2)}.`
      );
    }
  } else {
    if (rateCard.staffHourlyRateCents == null) {
      missing.push("staffHourlyRate");
    } else {
      laborCents = Math.round((rateCard.staffHourlyRateCents * paidMinutes) / 60);
      explanation.push(
        `Labor: full-time hourly × ${paidMinutes} estimated paid minutes = $${(laborCents / 100).toFixed(2)}.`
      );
    }
  }

  // --- Vehicle -----------------------------------------------------
  let vehicleCents: number | null = null;
  if (rateCard.vehiclePerMileCents == null) {
    missing.push("vehiclePerMileRate");
  } else {
    vehicleCents = Math.round(rateCard.vehiclePerMileCents * billableMiles);
    explanation.push(
      `Vehicle: ${billableMiles} billable miles (${request.routed ? "incremental, routed" : "dedicated round trip"}) = $${(vehicleCents / 100).toFixed(2)}.`
    );
  }

  // --- Other direct costs ------------------------------------------
  let otherCostCents: number | null = null;
  if (rateCard.supportAllowanceCents == null) {
    missing.push("supportAllowance");
  } else {
    otherCostCents = rateCard.supportAllowanceCents;
    if (rateCard.consumablesCents == null) {
      excluded.push("consumables");
    } else {
      otherCostCents += rateCard.consumablesCents;
    }
    if (rateCard.failureAllowanceCents == null) {
      excluded.push("failureAllowance");
    } else {
      otherCostCents += rateCard.failureAllowanceCents;
    }
  }

  // --- Target margin is a price input, not a nicety -----------------
  const margin = policy.targetMarginPercent;
  const stripeA = rateCard.stripePercent / 100;
  if (margin == null || margin <= 0 || 1 - stripeA - margin / 100 <= 0) {
    missing.push("targetMarginPercent");
  }

  const base: SmartPriceResult = {
    status: "NOT_CONFIGURED",
    engineVersion: SMART_ENGINE_VERSION,
    policyVersion: policy.version,
    rateCardVersion: rateCard.version,
    band,
    missingConfiguration: missing,
    excludedComponents: excluded,
    reviewReasons: [],
    components: [],
    estimatedPaidMinutes: paidMinutes,
    billableMiles,
    laborCents,
    vehicleCents,
    otherCostCents,
    directCostCents: null,
    breakEvenCents: null,
    targetCents: null,
    floorCents: null,
    finalCents: null,
    predictedContributionCents: null,
    predictedMarginPercent: null,
    confidence: "low",
    explanation,
    expiresAt: null,
  };

  if (missing.length > 0) {
    explanation.push(
      `Price not generated — missing configuration: ${missing.join(", ")}. Missing values are reported, never invented.`
    );
    return base;
  }

  // All required inputs exist from here on.
  const directCostCents = (laborCents as number) + (vehicleCents as number) + (otherCostCents as number);
  const stripeB = rateCard.stripeFixedCents;
  const marginFraction = (margin as number) / 100;

  // The payment fee is a percent of the FINAL price, so floors are
  // solved exactly rather than approximated:
  //   contribution(P) = P − C − (a·P + b) = P(1−a) − (C + b)
  //   break-even:  contribution = 0
  //   target:      contribution = margin · P
  const breakEvenCents = ceilDiv(directCostCents + stripeB, 1 - stripeA);
  const targetCents = ceilDiv(directCostCents + stripeB, 1 - stripeA - marginFraction);
  const minContributionPriceCents =
    policy.minContributionCents != null
      ? ceilDiv(directCostCents + stripeB + policy.minContributionCents, 1 - stripeA)
      : null;
  const floorCents = Math.max(
    breakEvenCents,
    minContributionPriceCents ?? 0,
    policy.minFeeCents ?? 0
  );
  explanation.push(
    `Direct cost $${(directCostCents / 100).toFixed(2)}; after-fee break-even $${(breakEvenCents / 100).toFixed(2)}; target at ${margin}% margin $${(targetCents / 100).toFixed(2)}; floor $${(floorCents / 100).toFixed(2)}.`
  );

  // --- Context modifiers (bounded, itemized) ------------------------
  const components: PriceComponent[] = [
    {
      code: "TARGET_BASE",
      label: "Target price (cost + margin, after payment fees)",
      amountCents: targetCents,
      basis: `direct cost ${directCostCents}¢, target margin ${margin}%`,
    },
  ];

  const addModifier = (
    code: string,
    label: string,
    percent: number | null,
    applies: boolean
  ): void => {
    if (!applies) return;
    if (percent == null) {
      explanation.push(`${label}: requested, but no adjustment is configured — none applied.`);
      return;
    }
    const delta = Math.round((targetCents * percent) / 100);
    components.push({ code, label, amountCents: delta, basis: `${percent}% of target` });
  };

  addModifier("URGENCY", "Urgency", request.urgency === "rush" ? policy.urgencyRushPercent : policy.urgencyPriorityPercent, request.urgency !== "scheduled");
  addModifier("SCARCITY", "Slot scarcity", request.slotScarcity === "scarce" ? policy.scarcityScarcePercent : policy.scarcityTightPercent, request.slotScarcity !== "normal");
  addModifier("COMPLEXITY", "Complexity", policy.complexityComplexPercent, request.complexity !== "standard");
  addModifier("SCHEDULE", "Off-hours schedule", policy.scheduleOffHoursPercent, request.scheduleBand === "off_hours");
  if (request.routed && policy.routeDensityCreditPercent != null) {
    const credit = Math.round((targetCents * policy.routeDensityCreditPercent) / 100);
    components.push({
      code: "ROUTE_DENSITY_CREDIT",
      label: "Route density credit",
      amountCents: -credit,
      basis: `${policy.routeDensityCreditPercent}% of target; clamped at floor`,
    });
  }

  const adjustedCents = components.reduce((sum, c) => sum + c.amountCents, 0);
  let finalCents = Math.max(adjustedCents, floorCents);
  if (finalCents !== adjustedCents) {
    explanation.push("Adjusted price fell below the floor; the floor price applies.");
  }
  if (policy.roundUpToCents != null && policy.roundUpToCents > 1) {
    finalCents = ceilDiv(finalCents, policy.roundUpToCents) * policy.roundUpToCents;
  }

  const feeCents = Math.round(stripeA * finalCents) + stripeB;
  const predictedContributionCents = finalCents - directCostCents - feeCents;
  const predictedMarginPercent = Math.round((predictedContributionCents / finalCents) * 10000) / 100;

  // --- Review gates --------------------------------------------------
  const reviewReasons: string[] = [];
  if (policy.autoApprovalCeilingCents != null && finalCents > policy.autoApprovalCeilingCents) {
    reviewReasons.push("ABOVE_AUTO_APPROVAL_CEILING");
  }
  if (request.complexity === "white_glove") {
    reviewReasons.push("WHITE_GLOVE_COMPLEXITY");
  }
  if (!request.routed && request.roundTripMiles >= 150) {
    reviewReasons.push("DEDICATED_LONG_DISTANCE");
  }

  const expiresAt = new Date(
    request.requestedAt.getTime() + policy.quoteExpiryMinutes * 60_000
  ).toISOString();

  explanation.push(
    `Final price $${(finalCents / 100).toFixed(2)}; predicted contribution $${(predictedContributionCents / 100).toFixed(2)} (${predictedMarginPercent}% after fees).`
  );

  return {
    ...base,
    status: reviewReasons.length > 0 ? "REVIEW_REQUIRED" : "AUTO_PRICED",
    missingConfiguration: [],
    reviewReasons,
    components,
    directCostCents,
    breakEvenCents,
    targetCents,
    floorCents,
    finalCents,
    predictedContributionCents,
    predictedMarginPercent,
    confidence: excluded.length > 0 ? "medium" : "high",
    explanation,
    expiresAt,
  };
}
