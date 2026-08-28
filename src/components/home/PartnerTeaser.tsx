import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

const PROPERTY_TYPES = [
  "RV parks",
  "Campgrounds",
  "Cabin resorts",
  "Vacation-rental properties",
  "Hunting lodges",
  "Ranch resorts",
  "Outdoor resorts",
  "Lake & recreational properties",
];

export function PartnerTeaser() {
  return (
    <section id="partners" className="scroll-mt-20 bg-ivory py-16 sm:py-24">
      <Container className="flex flex-col gap-8">
        <SectionHeading
          eyebrow="FOR PROPERTY PARTNERS"
          title="Bring City2Ranch to Your Guests"
          description="Forgot something? Need groceries or supplies? Give your guests a direct link to City2Ranch — private shopping and delivery, brought right to your property. A simple amenity for the businesses and properties that already serve people in rural and remote locations."
        />
        <ul className="flex flex-wrap gap-3">
          {PROPERTY_TYPES.map((item) => (
            <li
              key={item}
              className="rounded-full border border-navy/15 px-4 py-1.5 font-sans text-sm text-charcoal/70"
            >
              {item}
            </li>
          ))}
        </ul>
        <Button href="/contact?topic=partnership" variant="navy" className="self-start">
          Become a Partner
        </Button>
      </Container>
    </section>
  );
}
