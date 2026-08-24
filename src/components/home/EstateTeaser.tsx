import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

const AUDIENCE = [
  "Ranch owners",
  "Estates",
  "Hunting properties",
  "Vacation homes",
  "Rural Airbnb properties",
  "Small rural businesses",
  "Property managers",
];

export function EstateTeaser() {
  return (
    <section id="estates" className="scroll-mt-20 bg-navy-deep py-16 sm:py-24">
      <Container className="flex flex-col gap-8">
        <SectionHeading
          tone="light"
          eyebrow="ESTATES & BUSINESSES"
          title="City2Ranch for Ranches, Estates & Rural Businesses"
          description="Recurring supplies, household shopping, guest supplies, property essentials, scheduled deliveries and custom errands — arranged through a dedicated concierge relationship."
        />
        <ul className="flex flex-wrap gap-3">
          {AUDIENCE.map((item) => (
            <li
              key={item}
              className="rounded-full border border-ivory/20 px-4 py-1.5 font-sans text-sm text-ivory/80"
            >
              {item}
            </li>
          ))}
        </ul>
        <Button href="/request-service" variant="gold" className="self-start">
          Request Business Service
        </Button>
      </Container>
    </section>
  );
}
