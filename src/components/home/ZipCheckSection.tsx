import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ZipCheckForm } from "@/components/forms/ZipCheckForm";

export function ZipCheckSection() {
  return (
    <section className="bg-ivory py-16 sm:py-20">
      <Container className="flex flex-col gap-8">
        <SectionHeading
          eyebrow="SERVICE AREA"
          title="Does City2Ranch serve your area?"
          description="Enter your ZIP code to see whether City2Ranch currently serves your community or whether we're building a route near you."
        />
        <div className="max-w-xl">
          <ZipCheckForm />
        </div>
      </Container>
    </section>
  );
}
