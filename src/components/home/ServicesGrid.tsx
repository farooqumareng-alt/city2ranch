import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { SERVICES } from "@/lib/constants";

export function ServicesGrid() {
  return (
    <section className="bg-ivory py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="SERVICES"
          title="More Than Delivery."
          description="One private service for the things you don't want to drive into town for."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <Card key={service.name}>
              <h3 className="font-serif text-lg text-navy-deep">
                {service.name}
              </h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-charcoal/70">
                {service.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
