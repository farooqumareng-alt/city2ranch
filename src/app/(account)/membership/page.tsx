import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { SERVICE_TIERS } from "@/lib/constants";
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/lib/stripe/tiers";
import { membershipServicesConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { getMembershipSettings } from "@/lib/actions/membership-settings";
import { getOwnMembership, subscribeMembership, cancelMembership } from "@/lib/actions/membership";

export const metadata: Metadata = {
  title: "Membership",
  description: "City2Ranch service tiers.",
};

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
};

const MEMBERSHIP_PRICE_BY_TIER: Record<MembershipTier, number> = Object.fromEntries(
  MEMBERSHIP_TIERS.map((t) => [t.tier, t.monthlyCents])
) as Record<MembershipTier, number>;

export default async function MembershipPage() {
  const user = await getCurrentUser();
  const settings = await getMembershipSettings();
  const salesLive = settings.salesEnabled && membershipServicesConfigured();

  // Real billing is off — either the business hasn't turned membership
  // sales on yet (the default at launch — see membershipSettings' doc
  // comment in src/lib/db/schema.ts) or Stripe isn't fully configured.
  // Fall back to the original lead-capture cards rather than showing a
  // broken or premature checkout flow.
  if (!salesLive) {
    return (
      <div className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="Membership"
          description="City2Ranch is tiered around how much of your household you'd like us to take care of. Pricing is customized to your route and needs — request a tier below and a concierge will follow up."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {SERVICE_TIERS.map((tier) => (
            <div key={tier.key} className="flex flex-col gap-5 rounded-sm border border-navy/10 bg-white/60 p-8">
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  {tier.name}
                </p>
                <h3 className="mt-1 font-serif text-2xl text-navy-deep">{tier.subtitle}</h3>
              </div>
              <p className="font-sans text-sm text-charcoal/70">{tier.description}</p>
              <ul className="flex flex-col gap-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 font-sans text-sm text-charcoal/70">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button href={`/request-service?tier=${tier.key}`} variant="navy" className="mt-auto self-start">
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sales are live — real pricing and a real Checkout flow.
  const ownerId = user ? await getEffectiveOwnerId(user.id) : null;
  const membership = ownerId ? await getOwnMembership(ownerId) : null;
  const hasMembership = membership && membership.status !== "canceled";

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Membership"
        description="City2Ranch is tiered around how much of your household you'd like us to take care of."
      />

      {hasMembership && membership ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
          <div>
            <p className="font-sans text-sm text-navy-deep">
              You&apos;re on the <strong>{SERVICE_TIERS.find((t) => t.key === membership.tier)?.name ?? membership.tier}</strong>{" "}
              plan — {MEMBERSHIP_STATUS_LABELS[membership.status] ?? membership.status}.
            </p>
            {membership.currentPeriodEnd ? (
              <p className="font-sans text-xs text-charcoal/60">
                Renews {new Date(membership.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          {membership.status === "active" ? (
            <form action={cancelMembership.bind(null, membership.id)}>
              <Button type="submit" variant="outline-dark" size="md">
                Cancel
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {SERVICE_TIERS.map((tier) => {
            const monthlyCents = MEMBERSHIP_PRICE_BY_TIER[tier.key as MembershipTier];
            return (
              <div key={tier.key} className="flex flex-col gap-5 rounded-sm border border-navy/10 bg-white/60 p-8">
                <div>
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    {tier.name}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-navy-deep">{tier.subtitle}</h3>
                  {monthlyCents ? (
                    <p className="mt-2 font-serif text-3xl text-navy-deep">
                      ${(monthlyCents / 100).toFixed(0)}
                      <span className="font-sans text-sm text-charcoal/60">/mo</span>
                    </p>
                  ) : null}
                </div>
                <p className="font-sans text-sm text-charcoal/70">{tier.description}</p>
                <ul className="flex flex-col gap-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 font-sans text-sm text-charcoal/70">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <form action={subscribeMembership.bind(null, tier.key as MembershipTier)} className="mt-auto">
                  <Button type="submit" variant="navy" className="self-start">
                    Subscribe
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
