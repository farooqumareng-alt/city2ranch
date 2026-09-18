import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { PricingRuleForm } from "@/components/forms/PricingRuleForm";
import { updatePricingRule } from "@/lib/actions/pricing-management";
import { getZoneReadiness } from "@/lib/pricing/zone-readiness";
import { getAdminAuditLogFor } from "@/lib/admin-audit";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireManager } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Pricing Rule" };

// Only the 3 actions pricing-management.ts actually logs against
// targetType "pricing_rule" — the 2 concierge-quote override actions
// log against targetType "order" instead and never appear here.
const ACTION_LABELS: Record<string, string> = {
  pricing_rule_created: "Rule created",
  pricing_rule_updated: "Rule updated",
  pricing_rule_activated: "Rule activated",
};

export default async function EditPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireManager();
  const { id } = await params;

  const db = getDb();
  const [rows, history] = await Promise.all([
    db.select().from(pricingRules).where(eq(pricingRules.id, id)),
    getAdminAuditLogFor("pricing_rule", id),
  ]);
  const rule = rows[0];
  if (!rule) notFound();

  const targetMarginPercent = rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent);
  const readiness = getZoneReadiness({ ...rule, targetMarginPercent });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title={`Edit ${rule.serviceLabel ?? "Pricing Rule"}`}
          description={
            rule.isActive
              ? "This rule is currently active — changes take effect immediately for new orders."
              : `This rule is inactive — changes won't affect pricing until it's activated. Last updated ${new Date(rule.updatedAt).toLocaleString()}.`
          }
        />
        {!rule.isActive && readiness.status === "ready_for_review" ? (
          <Button href={`/internal/dispatch/pricing/${id}/activate`} variant="gold">
            Review &amp; Activate
          </Button>
        ) : null}
      </div>
      <div className="max-w-2xl">
        <PricingRuleForm
          action={updatePricingRule.bind(null, rule.id)}
          // Drizzle/postgres-js returns numeric columns as strings — same
          // conversion as pricing/repository.ts's mapRow(), needed here too
          // since this page reads the raw row directly rather than through
          // that function.
          rule={{
            ...rule,
            targetMarginPercent,
            zoneMinMiles: rule.zoneMinMiles == null ? null : Number(rule.zoneMinMiles),
            zoneMaxMiles: rule.zoneMaxMiles == null ? null : Number(rule.zoneMaxMiles),
          }}
          submitLabel="Save Changes"
        />
      </div>

      <section className="flex max-w-2xl flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Pricing History</h3>
        {history.length === 0 ? (
          <EmptyState message="No changes on record yet." />
        ) : (
          <RowList>
            {history.map((entry) => (
              <Row key={entry.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(entry.createdAt).toLocaleString()} · by{" "}
                    {entry.actorLabel ?? entry.actorEmail ?? "a staff member"}
                  </p>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
