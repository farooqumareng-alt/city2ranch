import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { listPricingRules } from "@/lib/actions/pricing-management";
import { getZoneReadiness, type ZoneStatus } from "@/lib/pricing/zone-readiness";
import { requireManager } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Pricing" };

const SERVICE_TYPE_LABELS: Record<string, string> = {
  pickup: "City Pickup",
  concierge: "Concierge",
};

// One badge per status, driven by the exact same getZoneReadiness()
// the real activation gate uses (pricing-management.ts) — this list
// and that gate can never disagree, because they're the same function.
const STATUS_BADGES: Record<ZoneStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-800" },
  ready_for_review: { label: "Ready for Review", className: "bg-gold/20 text-navy-deep" },
  incomplete: { label: "Incomplete", className: "bg-charcoal/10 text-charcoal/70" },
};

function formatDollars(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

/** rule.zoneMinMiles/zoneMaxMiles are numeric columns, returned as
 *  strings by drizzle-orm/postgres-js — same convention noted throughout
 *  pricing/repository.ts. */
function formatZoneMiles(min: string | null, max: string | null): string {
  if (min === null) return "";
  return max === null ? `${Number(min)}+ mi round trip` : `${Number(min)}–${Number(max)} mi round trip`;
}

export default async function PricingPage() {
  await requireManager();
  const rules = await listPricingRules();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="Pricing"
          description="Fee structure for both services. A plain (non-zoned) service has exactly one active rule; a zoned service can have several active at once, one per distance zone — activating a rule only ever deactivates whichever rule previously held that same zone."
        />
        <Button href="/internal/dispatch/pricing/new" variant="navy">
          Add Pricing Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState message="No pricing rules yet." />
      ) : (
        <RowList>
          {rules.map((rule) => {
            const readiness = getZoneReadiness({
              ...rule,
              targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
            });
            const badge = STATUS_BADGES[readiness.status];
            return (
              <Row key={rule.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-navy-deep">
                      {SERVICE_TYPE_LABELS[rule.serviceType] ?? rule.serviceType}
                    </span>
                    {rule.zoneKey ? (
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-navy-deep">
                        Zone: {rule.zoneKey}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide ${badge.className}`}>
                      {badge.label}
                    </span>
                    <Link
                      href={`/internal/dispatch/pricing/${rule.id}`}
                      className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                    >
                      {rule.serviceLabel ?? "(no customer-facing name set)"}
                    </Link>
                  </div>
                  <p className="font-sans text-xs text-charcoal/60">
                    {formatDollars(rule.baseFeeCents)} base + {formatDollars(rule.perMileCents)}/mile
                    {rule.minFeeCents !== null ? `, ${formatDollars(rule.minFeeCents)} minimum` : ""}
                    {rule.zoneKey !== null ? ` · ${formatZoneMiles(rule.zoneMinMiles, rule.zoneMaxMiles)}` : ""}
                    {" · Updated " + new Date(rule.updatedAt).toLocaleDateString()}
                  </p>
                  {readiness.status === "incomplete" ? (
                    <p className="font-sans text-xs text-charcoal/50">Missing: {readiness.missing.join(", ")}</p>
                  ) : null}
                </div>
                {!rule.isActive ? (
                  <Button href={`/internal/dispatch/pricing/${rule.id}/activate`} variant="outline-dark" size="md">
                    Review &amp; Activate
                  </Button>
                ) : null}
              </Row>
            );
          })}
        </RowList>
      )}
    </div>
  );
}
