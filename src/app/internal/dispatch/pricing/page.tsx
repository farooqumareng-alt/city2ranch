import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { listPricingRules, activatePricingZoneSet } from "@/lib/actions/pricing-management";
import { getZoneReadiness, getActiveCostWarnings, summarizeZoneSet, type ZoneStatus } from "@/lib/pricing/zone-readiness";
import { ActivateZoneSetButton } from "@/components/forms/ActivateZoneSetButton";
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

/** rule.zoneMinMiles is a numeric column, returned as a string by
 *  drizzle-orm/postgres-js — same convention noted throughout
 *  pricing/repository.ts. Threshold semantics (Build 2): a zone is
 *  just its starting mileage; it runs until the next zone's start. */
function formatZoneMiles(min: string | null): string {
  if (min === null) return "";
  return `${Number(min)}+ mi round trip`;
}

export default async function PricingPage() {
  await requireManager();
  const rules = await listPricingRules();

  // Zone-set summaries (Build 2 — QA-006): one per service type that
  // has zoned rules, so "is this service's zone set live?" is
  // answerable at a glance and the whole set can be activated in one
  // action instead of zone-by-zone clicks with a silent half-state
  // in between.
  const zoneSets = (["pickup", "concierge"] as const)
    .map((serviceType) => ({
      serviceType,
      summary: summarizeZoneSet(
        rules
          .filter((r) => r.serviceType === serviceType)
          .map((r) => ({
            ...r,
            targetMarginPercent: r.targetMarginPercent == null ? null : Number(r.targetMarginPercent),
          }))
      ),
    }))
    .filter(({ summary }) => summary.total > 0);

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

      {zoneSets.length > 0 ? (
        <div className="flex flex-col gap-4">
          {zoneSets.map(({ serviceType, summary }) => (
            <div
              key={serviceType}
              className="flex flex-col gap-2 rounded-sm border border-navy/10 bg-ivory/60 p-5"
            >
              <p className="font-sans text-sm text-navy-deep">
                {SERVICE_TYPE_LABELS[serviceType]} zones: {summary.active} of {summary.total} active
                {summary.ready > 0 ? `, ${summary.ready} ready for review` : ""}
                {summary.incomplete.length > 0 ? `, ${summary.incomplete.length} incomplete` : ""}.
              </p>
              {summary.incomplete.length > 0 ? (
                <p className="font-sans text-xs text-charcoal/60">
                  Incomplete:{" "}
                  {summary.incomplete.map((z) => `${z.zoneKey} (missing: ${z.missing.join(", ")})`).join("; ")}
                </p>
              ) : null}
              {summary.canActivate ? (
                <ActivateZoneSetButton
                  action={activatePricingZoneSet.bind(null, serviceType)}
                  label={`Activate all ${SERVICE_TYPE_LABELS[serviceType]} zones`}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

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
            const costWarnings = getActiveCostWarnings({
              ...rule,
              targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
            });
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
                    {rule.zoneKey !== null ? ` · ${formatZoneMiles(rule.zoneMinMiles)}` : ""}
                    {" · Updated " + new Date(rule.updatedAt).toLocaleDateString()}
                  </p>
                  {readiness.status === "incomplete" ? (
                    <p className="font-sans text-xs text-charcoal/50">Missing: {readiness.missing.join(", ")}</p>
                  ) : null}
                  {costWarnings.length > 0 ? (
                    <p className="font-sans text-xs text-charcoal/50">
                      Cost side not configured: {costWarnings.join(", ")} — orders are priced without a cost
                      evaluation until these are set.
                    </p>
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
