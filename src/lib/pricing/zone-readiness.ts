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

/**
 * Display-only companion to getZoneReadiness for a row that is ALREADY
 * active (Build 2, 2026-11-04 — PRC-02's warning half). The
 * isActive-wins rule above means an active row's missing cost fields
 * are never reported by readiness — correct for the activation gate,
 * but it left City Pickup's live rule (active, every cost field null)
 * looking fully configured on the admin list while its orders were
 * being priced with no cost evaluation at all. This names the gaps
 * for display next to the Active badge; it changes no gate behavior.
 */
export function getActiveCostWarnings(rule: ZoneReadinessInput): string[] {
  if (!rule.isActive) return [];
  const missing: string[] = [];
  if (rule.contractorFlatCostCents == null) missing.push("Contractor flat cost");
  if (rule.contractorPerMileCostCents == null) missing.push("Contractor per-mile cost");
  if (rule.sustainableCostAllowanceCents == null) missing.push("Sustainable cost allowance");
  if (rule.targetMarginPercent == null) missing.push("Target margin");
  return missing;
}

export type ZoneSetSummary = {
  total: number;
  active: number;
  ready: number;
  /** Inactive zones that are NOT ready, with what they're missing —
   *  the reason a set activation would be refused. */
  incomplete: { zoneKey: string; missing: string[] }[];
  /** True when the whole set can go live in one action: at least one
   *  zone exists, nothing is incomplete, and at least one zone is
   *  ready (not yet active) — a fully-active set has nothing to do. */
  canActivate: boolean;
};

/**
 * The set-level view the per-row readiness badges can't express
 * (Build 2, 2026-11-04 — QA-006): a zoned service is only really
 * "configured" when its zones go live TOGETHER. Activating them one
 * at a time left Concierge in a half-state where some mileages
 * auto-priced and others silently fell back to manual quotes, with
 * nothing anywhere saying the set was incomplete. Pure and shared by
 * the admin list's summary and activatePricingZoneSet's gate — same
 * never-disagree discipline as getZoneReadiness itself.
 */
export function summarizeZoneSet(
  rules: (ZoneReadinessInput & { zoneKey: string | null })[]
): ZoneSetSummary {
  const zoned = rules.filter((r) => r.zoneKey != null);
  let active = 0;
  let ready = 0;
  const incomplete: { zoneKey: string; missing: string[] }[] = [];

  for (const rule of zoned) {
    const readiness = getZoneReadiness(rule);
    if (readiness.status === "active") active += 1;
    else if (readiness.status === "ready_for_review") ready += 1;
    else incomplete.push({ zoneKey: rule.zoneKey as string, missing: readiness.missing });
  }

  return {
    total: zoned.length,
    active,
    ready,
    incomplete,
    canActivate: zoned.length > 0 && incomplete.length === 0 && ready > 0,
  };
}
