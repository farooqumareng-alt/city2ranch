/**
 * Whether a pricing_rules row is safe to activate — the one thing
 * activatePricingRule() (pricing-management.ts) had zero validation on
 * before this: a manager could click Activate on a still-placeholder
 * row and it would go live to real customers. Pure and DB-free (same
 * convention as compute-price.ts/zone-scope.ts) so it's directly unit-
 * tested and shared between the admin list's status badge and the real
 * server-side gate — the two can never disagree, because they're the
 * same function.
 */

/** The exact base fee every Phase 2 scaffold zone row was seeded with
 *  (see the Concierge zone seeding note) — never a real price. Named
 *  here, not re-typed at each call site, so a future seed using a
 *  different placeholder only needs one line changed. */
export const PLACEHOLDER_BASE_FEE_CENTS = 1;

export type ZoneStatus = "incomplete" | "ready_for_review" | "active";

export type ZoneReadinessInput = {
  isActive: boolean;
  baseFeeCents: number;
  contractorFlatCostCents: number | null;
  contractorPerMileCostCents: number | null;
  sustainableCostAllowanceCents: number | null;
  targetMarginPercent: number | null;
};

export type ZoneReadiness = {
  status: ZoneStatus;
  /** Human-readable reasons this row isn't ready — empty once
   *  ready_for_review or active. Never populated for an active row:
   *  isActive already means a human activated it under whatever rules
   *  applied then (see the isActive-wins rule below), so re-litigating
   *  its completeness here would wrongly flag rows like City Pickup's
   *  (real, live, but with NULL cost fields exactly as Phase 1 left
   *  every existing row) as broken. */
  missing: string[];
};

/**
 * isActive:true always wins, regardless of field completeness — an
 * already-active row is trusted as-is; this function only judges
 * whether an INACTIVE row is safe to transition to active, never
 * retroactively second-guesses a row that already is. Otherwise:
 * "incomplete" if any of the 4 cost fields is null or the base fee is
 * still the seeded placeholder value; "ready_for_review" once every
 * field has a real-looking value. This function never sees a market
 * or database — activatePricingRule() is the one place that turns
 * "incomplete" into an actual refusal.
 */
export function getZoneReadiness(rule: ZoneReadinessInput): ZoneReadiness {
  if (rule.isActive) return { status: "active", missing: [] };

  const missing: string[] = [];
  if (rule.baseFeeCents === PLACEHOLDER_BASE_FEE_CENTS) missing.push("Base fee (still the placeholder value)");
  if (rule.contractorFlatCostCents == null) missing.push("Contractor flat cost");
  if (rule.contractorPerMileCostCents == null) missing.push("Contractor per-mile cost");
  if (rule.sustainableCostAllowanceCents == null) missing.push("Sustainable cost allowance");
  if (rule.targetMarginPercent == null) missing.push("Target margin");

  return { status: missing.length === 0 ? "ready_for_review" : "incomplete", missing };
}
