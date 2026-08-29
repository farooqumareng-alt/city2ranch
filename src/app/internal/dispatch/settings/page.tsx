import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MembershipSalesToggleForm } from "@/components/forms/MembershipSalesToggleForm";
import { requireStaff } from "@/lib/auth/roles";
import { getMembershipSettings } from "@/lib/actions/membership-settings";
import { membershipServicesConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function StaffSettingsPage() {
  await requireStaff();
  const settings = await getMembershipSettings();
  const stripeReady = membershipServicesConfigured();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="STAFF" title="Settings" description="Platform-wide switches." />

      <div className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
        {!stripeReady ? (
          <p className="font-sans text-xs text-charcoal/60">
            Stripe subscription pricing isn&apos;t fully configured yet (STRIPE_SECRET_KEY and a
            STRIPE_PRICE_* env var per tier are required) — turning this on won&apos;t let customers
            actually subscribe until that&apos;s done.
          </p>
        ) : null}
        <MembershipSalesToggleForm salesEnabled={settings.salesEnabled} />
      </div>
    </div>
  );
}
