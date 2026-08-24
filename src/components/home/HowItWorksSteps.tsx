import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HOW_IT_WORKS_STEPS } from "@/lib/constants";

export function HowItWorksSteps() {
  return (
    <section className="bg-white/40 py-16 sm:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="HOW IT WORKS"
          title="A Better Way to Get What You Need."
          align="center"
        />
        <div className="relative grid gap-10 sm:grid-cols-3">
          <div
            className="absolute top-6 right-0 left-0 hidden h-px bg-gold/30 sm:block"
            aria-hidden
          />
          {HOW_IT_WORKS_STEPS.map((item) => (
            <div key={item.step} className="relative flex flex-col items-center gap-3 text-center">
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-ivory font-serif text-lg text-navy-deep">
                {item.step}
              </span>
              <h3 className="font-serif text-xl text-navy-deep">{item.title}</h3>
              <p className="max-w-xs font-sans text-sm leading-relaxed text-charcoal/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
