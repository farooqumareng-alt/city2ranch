import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PricingRuleForm } from "@/components/forms/PricingRuleForm";
import { updatePricingRule } from "@/lib/actions/pricing-management";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Pricing Rule" };

export default async function EditPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const db = getDb();
  const rows = await db.select().from(pricingRules).where(eq(pricingRules.id, id));
  const rule = rows[0];
  if (!rule) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="BUSINESS"
        title={`Edit ${rule.serviceLabel ?? "Pricing Rule"}`}
        description={
          rule.isActive
            ? "This rule is currently active — changes take effect immediately for new orders."
            : "This rule is inactive — changes won't affect pricing until it's activated."
        }
      />
      <div className="max-w-2xl">
        <PricingRuleForm action={updatePricingRule.bind(null, rule.id)} rule={rule} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
