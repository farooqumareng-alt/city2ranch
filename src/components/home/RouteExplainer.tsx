import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function RouteExplainer() {
  return (
    <section className="bg-ivory py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="OUR MODEL"
          title="We're Building Routes, Not Just Deliveries."
          description="City2Ranch creates scheduled rural routes so customers in the same region can share access to dependable city-side shopping and concierge services."
        />
      </Container>
    </section>
  );
}
