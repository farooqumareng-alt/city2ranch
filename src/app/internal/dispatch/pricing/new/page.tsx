import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PricingRuleForm } from "@/components/forms/PricingRuleForm";
import { createPricingRule } from "@/lib/actions/pricing-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Add Pricing Rule" };

export default async function NewPricingRulePage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="BUSINESS"
        title="Add Pricing Rule"
        description="New rules start inactive — activate one from the Pricing list when it's ready to take effect."
      />
      <div className="max-w-2xl">
        <PricingRuleForm action={createPricingRule} submitLabel="Save Pricing Rule" />
      </div>
    </div>
  );
}
