import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FoundingAccessForm } from "@/components/forms/FoundingAccessForm";

export function FoundingCTA() {
  return (
    <section id="founding" className="scroll-mt-20 bg-white/40 py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="EARLY ACCESS"
          title="Become a Founding City2Ranch Member."
          description="We're currently establishing our first private rural routes. Founding customers help determine where City2Ranch goes next."
        />
        <div className="max-w-2xl">
          <FoundingAccessForm />
        </div>
      </Container>
    </section>
  );
}
