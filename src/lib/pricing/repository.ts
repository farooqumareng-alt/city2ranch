import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pricingRules, zipMileage } from "@/lib/db/schema";
import { DEFAULT_SERVICE_LABEL, type PricingRule } from "@/lib/pricing/compute-price";

export type ServiceType = "pickup" | "concierge";

/** The customer-facing PricingRule plus the Phase 1 cost-side fields —
 *  a superset of the old shape, so every existing caller destructuring
 *  baseFeeCents/perMileCents/minFeeCents/serviceLabel is unaffected. */
export type PricingRuleRow = PricingRule & {
  id: string;
  isActive: boolean;
  updatedAt: Date;
  contractorFlatCostCents: number | null;
  contractorPerMileCostCents: number | null;
  sustainableCostAllowanceCents: number | null;
  targetMarginPercent: number | null;
  // Phase 2 zone fields (see schema.ts's own doc comment on
  // pricingRules) — all null together means this row is unzoned/flat.
  zoneKey: string | null;
  zoneLabel: string | null;
  zoneMinMiles: number | null;
  zoneMaxMiles: number | null;
};

function mapRow(rule: typeof pricingRules.$inferSelect): PricingRuleRow {
  return {
    id: rule.id,
    isActive: rule.isActive,
    updatedAt: rule.updatedAt,
    baseFeeCents: rule.baseFeeCents,
    perMileCents: rule.perMileCents,
    minFeeCents: rule.minFeeCents,
    serviceLabel: rule.serviceLabel ?? DEFAULT_SERVICE_LABEL,
    contractorFlatCostCents: rule.contractorFlatCostCents,
    contractorPerMileCostCents: rule.contractorPerMileCostCents,
    sustainableCostAllowanceCents: rule.sustainableCostAllowanceCents,
    // Drizzle/postgres-js returns `numeric` columns as strings.
    targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
    zoneKey: rule.zoneKey,
    zoneLabel: rule.zoneLabel,
    zoneMinMiles: rule.zoneMinMiles == null ? null : Number(rule.zoneMinMiles),
    zoneMaxMiles: rule.zoneMaxMiles == null ? null : Number(rule.zoneMaxMiles),
  };
}

async function findActiveRows(serviceType: ServiceType) {
  const db = getDb();
  return db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.isActive, true), eq(pricingRules.serviceType, serviceType)));
}

/**
 * The currently-active pricing rule for a service type. Throws if none
 * is configured or if more than one is marked active (the app is the
 * only thing enforcing "only one active row per service type" — see
 * the pricing_rules_one_active_per_market_service index for the
 * database-level backstop — this is a hard failure, not a default,
 * since silently picking one would hide a real misconfiguration).
 *
 * `serviceType` defaults to "pickup" so every existing call site
 * (submit-order.ts calls this with zero arguments) is completely
 * unaffected by Pricing Engine Phase 1 — City Pickup must always have
 * an active rule, exactly as before.
 */
export async function getActivePricingRule(serviceType: ServiceType = "pickup"): Promise<PricingRuleRow> {
  const rows = await findActiveRows(serviceType);

  if (rows.length === 0) {
    throw new Error(`No active pricing_rules row is configured for service type "${serviceType}".`);
  }
  if (rows.length > 1) {
    throw new Error(
      `${rows.length} pricing_rules rows are marked active for "${serviceType}" — expected exactly one.`
    );
  }

  return mapRow(rows[0]);
}

/**
 * Resolves the active pricing rule for a service type against a real
 * round-trip-mileage figure — Pricing Engine Phase 2. Returns null
 * instead of throwing when nothing is configured, same as the old
 * getActivePricingRuleOrNull() this replaces (its only caller,
 * getConciergeSuggestion(), needed mileage-aware selection once a
 * service type can have more than one active row — one per zone —
 * instead of exactly one). "Not configured yet" stays a normal,
 * expected Phase 1/2 state here, not a misconfiguration the way it
 * would be for City Pickup's getActivePricingRule().
 *
 * Three shapes of active rows are handled:
 *  - Zero rows: null (nothing configured for this service at all).
 *  - Exactly one row, unzoned (zoneKey null): return it unconditionally
 *    — this is the plain flat-rate shape, byte-identical to the old
 *    function's behavior, so a service that never configures zones is
 *    completely unaffected by this change.
 *  - One or more zoned rows: return whichever row's [zoneMinMiles,
 *    zoneMaxMiles ?? Infinity] band contains roundTripMiles. No match
 *    (mileage past every configured zone, e.g. beyond a 100mi top
 *    band) is null, not an invented price — the caller falls back to
 *    a fully manual quote, exactly like any other "not configured"
 *    case. More than one match (overlapping zone bands) is a real
 *    configuration bug and throws, same "hard-fail on ambiguity, never
 *    guess" posture as the >1-active-row check below.
 *
 * Mixing zoned and unzoned active rows for the same service type isn't
 * a supported state — pricing-management.ts's create/update validation
 * is what should prevent this from ever being saved; this function
 * still throws defensively if it's ever seen anyway.
 */
export async function getActivePricingRuleForZone(
  serviceType: ServiceType,
  roundTripMiles: number
): Promise<PricingRuleRow | null> {
  const rows = await findActiveRows(serviceType);
  return selectZoneMatch(rows.map(mapRow), roundTripMiles, serviceType);
}

/**
 * The pure selection logic behind getActivePricingRuleForZone() above,
 * split out so it's unit-testable without a database (see
 * zone-resolution.test.ts) — matches this codebase's existing
 * convention of only pure/derive functions getting direct test
 * coverage (compute-price.ts, orders/status.ts), never a DB-backed
 * action. `rows` is every active row already fetched for the given
 * service type; `serviceType` is only used to make an error message
 * readable, not to re-filter anything.
 */
export function selectZoneMatch(
  rows: PricingRuleRow[],
  roundTripMiles: number,
  serviceType: ServiceType
): PricingRuleRow | null {
  if (rows.length === 0) return null;

  const zoned = rows.filter((r) => r.zoneKey != null);
  const unzoned = rows.filter((r) => r.zoneKey == null);

  if (zoned.length > 0 && unzoned.length > 0) {
    throw new Error(
      `pricing_rules has both zoned and unzoned active rows for "${serviceType}" — these shapes can't coexist.`
    );
  }

  if (zoned.length === 0) {
    if (unzoned.length > 1) {
      throw new Error(
        `${unzoned.length} pricing_rules rows are marked active for "${serviceType}" — expected exactly one.`
      );
    }
    return unzoned[0];
  }

  const matches = zoned.filter((r) => {
    if (r.zoneMinMiles == null) return false; // malformed zone row — no lower bound at all
    return roundTripMiles >= r.zoneMinMiles && (r.zoneMaxMiles == null || roundTripMiles <= r.zoneMaxMiles);
  });

  if (matches.length > 1) {
    throw new Error(
      `${matches.length} active pricing_rules zones overlap at ${roundTripMiles} round-trip miles for "${serviceType}" — zone bands must not overlap.`
    );
  }

  return matches.length === 1 ? matches[0] : null;
}

/**
 * Every currently-active zoned rule for a service type, for a manual
 * zone-override selector (see getConciergeSuggestion's overrideRuleId
 * param) — staff choosing among real, currently-live zones, never an
 * arbitrary or inactive one. Empty array whenever nothing is zoned yet
 * (today's real state for "concierge") or nothing is active at all.
 * Unzoned rules are never candidates for an override selector — there's
 * only ever one of those anyway, and it's already what auto-match falls
 * back to with no override.
 */
export async function getActiveZonedRulesForService(serviceType: ServiceType): Promise<PricingRuleRow[]> {
  const rows = await findActiveRows(serviceType);
  return rows.filter((r) => r.zoneKey != null).map(mapRow);
}

/**
 * Fetches one specific rule by id, but only returns it if it's
 * genuinely active and belongs to the given service type — the
 * server-side check behind a manual zone override (a client can submit
 * any id; this is what actually verifies it's a real, live, correctly-
 * scoped rule before it's ever used to compute a price). Null for a
 * missing, inactive, or wrong-service-type id — the caller's job is to
 * fall back to auto-matching, never to trust the id blindly.
 */
export async function getActivePricingRuleById(id: string, serviceType: ServiceType): Promise<PricingRuleRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.isActive, true), eq(pricingRules.serviceType, serviceType)));
  return rows.length === 1 ? mapRow(rows[0]) : null;
}

/**
 * Round-trip mileage for a served ZIP, or null if the ZIP isn't
 * currently serviceable. This is the ONLY source of mileage a price is
 * ever computed from — the customer never supplies it.
 */
export async function getZipMileage(zip: string): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({ roundTripMiles: zipMileage.roundTripMiles })
    .from(zipMileage)
    .where(eq(zipMileage.zip, zip));

  if (rows.length === 0) return null;
  // Drizzle/postgres-js returns `numeric` columns as strings.
  return Number(rows[0].roundTripMiles);
}
