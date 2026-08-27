import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { SERVICE_TIERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Membership",
  description: "City2Ranch service tiers.",
};

// There is no billed membership product yet — no real plans, prices, or
// benefits have been decided. This shows the same tier descriptions
// already on the public site (src/lib/constants.ts SERVICE_TIERS) and
// routes interest through the real, existing request pipeline rather
// than inventing pricing or fake "included" checkmarks.
export default function MembershipPage() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Membership"
        description="City2Ranch is tiered around how much of your household you'd like us to take care of. Pricing is customized to your route and needs — request a tier below and a concierge will follow up."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {SERVICE_TIERS.map((tier) => (
          <div
            key={tier.key}
            className="flex flex-col gap-5 rounded-sm border border-navy/10 bg-white/60 p-8"
          >
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
