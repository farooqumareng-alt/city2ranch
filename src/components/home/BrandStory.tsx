import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function BrandStory() {
  return (
    <section className="bg-white/40 py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="OUR STORY"
          title="Distance Shouldn't Limit Your Convenience."
          description="Living beyond the city comes with freedom, privacy and space. But everyday errands can require hours of driving. City2Ranch was created to bridge that gap — connecting rural households with the stores, services and conveniences of the city through a dependable, premium experience designed around your schedule."
        />
      </Container>
    </section>
  );
}
