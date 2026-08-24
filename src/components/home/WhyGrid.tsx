import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WHY_CITY2RANCH } from "@/lib/constants";

export function WhyGrid() {
  return (
    <section className="bg-ivory py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="WHY CITY2RANCH"
          title="The Convenience of the City. The Privacy of the Ranch."
        />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CITY2RANCH.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <span className="h-px w-8 bg-gold" aria-hidden />
              <h3 className="font-serif text-lg text-navy-deep">{item.title}</h3>
              <p className="font-sans text-sm leading-relaxed text-charcoal/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
