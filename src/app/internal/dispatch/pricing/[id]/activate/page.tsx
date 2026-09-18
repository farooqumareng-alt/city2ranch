import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { activatePricingRule } from "@/lib/actions/pricing-management";
import { getZoneReadiness } from "@/lib/pricing/zone-readiness";
import {
  computeHardCost,
  computeSustainableFloor,
  computeTargetProfitPrice,
  type CostConfig,
} from "@/lib/pricing/compute-price";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireManager } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Review & Activate Pricing Rule" };

function formatDollars(cents: number | null): string {
  if (cents === null) return "Not configured";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The "display a clear summary of what will become available to
 * customers" step called for in the safe-activation workflow — a real
 * page, not a JS confirm() popup (no modal library exists in this
 * codebase; dedicated pages are the established pattern for anything
 * consequential). Renders the economics at the zone's own mileage
 * boundaries (or just once for a plain flat-rate rule) using the exact
 * same compute-price.ts functions the live suggestion engine uses — no
 * new formula. If the rule isn't ready, no activate control renders at
 * all — the gate is enforced again, for real, inside
 * activatePricingRule() itself; this page only decides what to show.
 */
export default async function ActivatePricingRulePage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;

  const db = getDb();
  const rows = await db.select().from(pricingRules).where(eq(pricingRules.id, id));
  const rule = rows[0];
  if (!rule) notFound();

  const config: CostConfig = {
    contractorFlatCostCents: rule.contractorFlatCostCents,
    contractorPerMileCostCents: rule.contractorPerMileCostCents,
    sustainableCostAllowanceCents: rule.sustainableCostAllowanceCents,
    targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
  };
  const readiness = getZoneReadiness({ ...rule, targetMarginPercent: config.targetMarginPercent });

  // For a zoned rule, show the economics at both ends of its mileage
  // band (cheapest and most expensive real trip it will price) — a
  // flat rule has no band, so just one row at its own baseFeeCents
  // math (0 extra miles beyond the base fee itself).
  const zoneMin = rule.zoneMinMiles == null ? null : Number(rule.zoneMinMiles);
  const zoneMax = rule.zoneMaxMiles == null ? null : Number(rule.zoneMaxMiles);
  const previewMileages = rule.zoneKey != null ? [zoneMin ?? 0, zoneMax ?? zoneMin ?? 0] : [0];

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="BUSINESS"
        title={`Activate ${rule.serviceLabel ?? rule.zoneLabel ?? "Pricing Rule"}`}
        description="Review exactly what this makes available to customers before it goes live."
      />

      {readiness.status !== "ready_for_review" ? (
        <div className="flex flex-col gap-4 rounded-sm border border-red-200 bg-red-50 p-6">
          <p className="font-sans text-sm text-red-700">
            {readiness.status === "active"
              ? "This rule is already active."
              : "This rule isn't ready to activate yet."}
          </p>
          {readiness.missing.length > 0 ? (
            <ul className="list-disc pl-5 font-sans text-sm text-red-700">
              {readiness.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          <Link
            href={`/internal/dispatch/pricing/${id}`}
            className="self-start font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
          >
            ← Edit this rule
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
            <p className="font-sans text-sm text-navy-deep">
              Once activated, <strong>{rule.zoneLabel ?? rule.serviceLabel}</strong> becomes the live price for{" "}
              {rule.zoneKey != null ? (
                <>Concierge orders in the {formatZoneRange(zoneMin, zoneMax)} range</>
              ) : (
                <>every {rule.serviceType === "pickup" ? "City Pickup" : "Concierge"} order</>
              )}
              .
            </p>
            <div className="overflow-x-auto">
              <table className="w-full font-sans text-sm">
                <thead>
                  <tr className="text-left text-charcoal/50">
                    <th className="pb-2 pr-4">Round trip</th>
                    <th className="pb-2 pr-4">Customer sees</th>
                    <th className="pb-2 pr-4">Hard cost</th>
                    <th className="pb-2 pr-4">Sustainable floor</th>
                    <th className="pb-2">Target profit price</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMileages.map((miles) => {
                    const hardCost = computeHardCost(config, miles);
                    const sustainableFloor = computeSustainableFloor(hardCost, config);
                    const targetProfitPrice = computeTargetProfitPrice(sustainableFloor, config);
                    const customerPrice = rule.baseFeeCents + Math.round(rule.perMileCents * miles);
                    return (
                      <tr key={miles} className="border-t border-navy/10">
                        <td className="py-2 pr-4">{miles} mi</td>
                        <td className="py-2 pr-4 font-medium text-navy-deep">{formatDollars(customerPrice)}</td>
                        <td className="py-2 pr-4">
                          {hardCost.status === "available" ? formatDollars(hardCost.cents) : "Not configured"}
                        </td>
                        <td className="py-2 pr-4">
                          {sustainableFloor.status === "available"
                            ? formatDollars(sustainableFloor.cents)
                            : "Not configured"}
                        </td>
                        <td className="py-2">
                          {targetProfitPrice.status === "available"
                            ? formatDollars(targetProfitPrice.cents)
                            : "Not configured"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rule.note ? <p className="font-sans text-xs text-charcoal/50">Internal note: {rule.note}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            <JobActionButton
              action={activatePricingRule.bind(null, rule.id)}
              label="Confirm & Activate"
              pendingLabel="Activating…"
              variant="gold"
              size="lg"
            />
            <Button href={`/internal/dispatch/pricing/${id}`} variant="outline-dark">
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function formatZoneRange(min: number | null, max: number | null): string {
  if (min == null) return "its configured";
  return max == null ? `${min}+ mile` : `${min}–${max} mile`;
}
