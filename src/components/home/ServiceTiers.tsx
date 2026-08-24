import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { SERVICE_TIERS } from "@/lib/constants";

export function ServiceTiers() {
  return (
    <section className="bg-navy-deep py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          tone="light"
          eyebrow="THE MODEL"
          title="Service Designed Around You."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {SERVICE_TIERS.map((tier) => (
            <div
              key={tier.key}
              className="flex flex-col gap-5 rounded-sm border border-ivory/15 bg-navy p-8"
            >
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  {tier.name}
                </p>
                <h3 className="mt-1 font-serif text-2xl text-ivory">
                  {tier.subtitle}
                </h3>
              </div>
              <p className="font-sans text-sm text-ivory/70">
                {tier.description}
              </p>
              <ul className="flex flex-col gap-2">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 font-sans text-sm text-ivory/80"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href="/request-service"
                variant="outline-light"
                className="mt-auto self-start"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="font-sans text-sm text-ivory/60">
          Pricing is customized according to distance, service requirements
          and route availability.
        </p>
      </Container>
    </section>
  );
}
