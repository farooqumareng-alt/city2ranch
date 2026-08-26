import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pricingRules, zipMileage } from "@/lib/db/schema";
import { DEFAULT_SERVICE_LABEL, type PricingRule } from "@/lib/pricing/compute-price";

/**
 * The currently-active pricing rule. Throws if none is configured or if
 * more than one is marked active (the app is the only thing enforcing
 * "only one active row at a time" — this is a hard failure, not a
 * default, since silently picking one would hide a real
 * misconfiguration).
 */
export async function getActivePricingRule(): Promise<
  PricingRule & { id: string }
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.isActive, true));

  if (rows.length === 0) {
    throw new Error("No active pricing_rules row is configured.");
  }
  if (rows.length > 1) {
    throw new Error(
      `${rows.length} pricing_rules rows are marked active — expected exactly one.`
    );
  }

  const rule = rows[0];
  return {
    id: rule.id,
    baseFeeCents: rule.baseFeeCents,
    perMileCents: rule.perMileCents,
    minFeeCents: rule.minFeeCents,
    serviceLabel: rule.serviceLabel ?? DEFAULT_SERVICE_LABEL,
  };
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
