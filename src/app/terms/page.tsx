import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of City2Ranch's website and service.",
};

export default function TermsPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading eyebrow="LEGAL" title="Terms of Service" />

      <div className="flex max-w-2xl flex-col gap-6 font-sans text-sm leading-relaxed text-charcoal/80 sm:text-base">
        <p className="text-charcoal/60">
          Last updated: this page is a working draft and will be reviewed by
          legal counsel before City2Ranch launches publicly.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            About This Service
          </h2>
          <p>
            City2Ranch is a private rural concierge and delivery service.
            Service is provided by appointment, on scheduled routes, in
            select rural areas — we are currently establishing our first
            routes and do not yet serve every area.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            Requests &amp; Pricing
          </h2>
          <p>
            Submitting a request through this website is not a guarantee of
            service. A City2Ranch concierge will review your request and
            contact you with availability and pricing before any service is
            confirmed. Pricing is customized according to distance, service
            requirements and route availability.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            Regulated Items
          </h2>
          <p>
            City2Ranch does not commit to sourcing or delivering items that
            require special licensing or regulatory authorization. Any such
            requests will be evaluated on a case-by-case basis and may be
            declined.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            Changes to These Terms
          </h2>
          <p>
            We may update these terms as City2Ranch&apos;s service area and
            offerings evolve. Continued use of this website after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">Contact</h2>
          <p>
            Questions about these terms can be sent through our{" "}
            <a href="/contact" className="text-navy-deep underline hover:text-gold">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
