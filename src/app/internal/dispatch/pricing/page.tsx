import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { listPricingRules, activatePricingRule } from "@/lib/actions/pricing-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Pricing" };

function formatDollars(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PricingPage() {
  await requireStaff();
  const rules = await listPricingRules();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="Pricing"
          description="City Pickup fee structure. Exactly one rule is active at a time — activating a rule deactivates whichever one currently is."
        />
        <Button href="/internal/dispatch/pricing/new" variant="navy">
          Add Pricing Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState message="No pricing rules yet." />
      ) : (
        <RowList>
          {rules.map((rule) => (
            <Row key={rule.id}>
              <div>
                <Link
                  href={`/internal/dispatch/pricing/${rule.id}`}
                  className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                >
                  {rule.serviceLabel ?? "(no customer-facing name set)"}
                </Link>
                <p className="font-sans text-xs text-charcoal/60">
                  {formatDollars(rule.baseFeeCents)} base + {formatDollars(rule.perMileCents)}/mile
                  {rule.minFeeCents !== null ? `, ${formatDollars(rule.minFeeCents)} minimum` : ""}
                  {rule.isActive ? " · Active" : ""}
                </p>
              </div>
              {!rule.isActive ? (
                <JobActionButton
                  action={activatePricingRule.bind(null, rule.id)}
                  label="Activate"
                  pendingLabel="Activating…"
                  variant="outline-dark"
                  size="md"
                />
              ) : null}
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
