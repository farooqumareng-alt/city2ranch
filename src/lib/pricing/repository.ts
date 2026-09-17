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
  contractorFlatCostCents: number | null;
  contractorPerMileCostCents: number | null;
  sustainableCostAllowanceCents: number | null;
  targetMarginPercent: number | null;
};

function mapRow(rule: typeof pricingRules.$inferSelect): PricingRuleRow {
  return {
    id: rule.id,
    baseFeeCents: rule.baseFeeCents,
    perMileCents: rule.perMileCents,
    minFeeCents: rule.minFeeCents,
    serviceLabel: rule.serviceLabel ?? DEFAULT_SERVICE_LABEL,
    contractorFlatCostCents: rule.contractorFlatCostCents,
    contractorPerMileCostCents: rule.contractorPerMileCostCents,
    sustainableCostAllowanceCents: rule.sustainableCostAllowanceCents,
    // Drizzle/postgres-js returns `numeric` columns as strings.
    targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
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
 * Same lookup as getActivePricingRule(), but returns null instead of
 * throwing when nothing is configured — used by Concierge's suggestion
 * path (finalize-concierge-quote.ts), where "not configured yet" is a
 * normal, expected Phase 1 state, not a misconfiguration the way it
 * would be for City Pickup. Still throws on >1 active row for the same
 * service type — that's a real data-integrity problem regardless of
 * which service type it's for.
 */
export async function getActivePricingRuleOrNull(serviceType: ServiceType): Promise<PricingRuleRow | null> {
  const rows = await findActiveRows(serviceType);

  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw new Error(
      `${rows.length} pricing_rules rows are marked active for "${serviceType}" — expected exactly one.`
    );
  }

  return mapRow(rows[0]);
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
