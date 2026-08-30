import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { serviceAreaLeads } from "@/lib/db/schema";
import { getZipMileage } from "@/lib/pricing/repository";

export type ServiceZoneStatus = "active" | "developing" | "outside";

/**
 * The single source of truth for "what does City2Ranch's coverage look
 * like for this ZIP" — replaces two mechanisms that used to disagree
 * with each other: the real one (zipMileage, which actually gates
 * pricing/orders) and a fake one (src/lib/zip-coverage.ts's hardcoded,
 * empty SERVED_ZIP_CODES array, which the marketing ZIP-check widget
 * used instead — meaning the public widget said "Coming Soon" for
 * every ZIP, including ones fully active and priceable today).
 *
 * Three tiers, all backed by data that already exists — no new schema:
 * - "active": a real zipMileage row exists (unchanged pricing source
 *   of truth, still FK'd from orders.deliveryZip exactly as before).
 * - "developing": no zipMileage row, but at least one real
 *   serviceAreaLeads signup for this ZIP — grounded in actual expressed
 *   demand, not a staff-curated flag someone has to remember to set.
 * - "outside": neither.
 */
export async function getServiceZoneStatus(
  zip: string
): Promise<{ status: ServiceZoneStatus; roundTripMiles: number | null }> {
  const roundTripMiles = await getZipMileage(zip);
  if (roundTripMiles !== null) {
    return { status: "active", roundTripMiles };
  }

  const db = getDb();
  const leads = await db
    .select({ id: serviceAreaLeads.id })
    .from(serviceAreaLeads)
    .where(eq(serviceAreaLeads.zip, zip))
    .limit(1);

  return { status: leads.length > 0 ? "developing" : "outside", roundTripMiles: null };
}
