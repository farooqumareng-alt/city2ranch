import { Container } from "@/components/ui/Container";

export function TestimonialPlaceholder() {
  return (
    <section className="bg-navy-deep py-16 sm:py-20">
      <Container className="flex flex-col items-center gap-6 text-center">
        <p className="max-w-2xl font-serif text-2xl leading-relaxed text-ivory sm:text-3xl">
          &ldquo;City2Ranch gives us back hours every week. We no longer have
          to make a long trip into town just to take care of everyday
          shopping.&rdquo;
        </p>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Founding Customer
        </p>
        <p className="font-sans text-xs text-ivory/40">
          Illustrative example — City2Ranch is currently establishing its
          first founding customers.
        </p>
      </Container>
    </section>
  );
}
