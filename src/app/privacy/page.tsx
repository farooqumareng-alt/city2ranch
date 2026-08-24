import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How City2Ranch collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading eyebrow="LEGAL" title="Privacy Policy" />

      <div className="flex max-w-2xl flex-col gap-6 font-sans text-sm leading-relaxed text-charcoal/80 sm:text-base">
        <p className="text-charcoal/60">
          Last updated: this page is a working draft and will be reviewed by
          legal counsel before City2Ranch launches publicly.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            Information We Collect
          </h2>
          <p>
            When you request service, join a waitlist, or contact us, we
            collect the information you provide directly — such as your
            name, email address, phone number, delivery address, ZIP code,
            and details about the service you&apos;re requesting (for
            example, a shopping list or preferred store).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            How We Use Your Information
          </h2>
          <p>
            We use the information you provide to respond to your requests,
            coordinate and deliver service, notify our concierge team of new
            requests, and communicate with you about your service. We do not
            sell your personal information.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">
            Service Providers
          </h2>
          <p>
            We use trusted third-party service providers to operate this
            website and service — for example, providers who host our
            database and providers who deliver email notifications on our
            behalf. These providers only receive the information necessary
            to perform their function and are not permitted to use it for
            their own purposes.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">Your Choices</h2>
          <p>
            You may contact us at any time to ask what information we hold
            about you, to correct it, or to request that we delete it,
            subject to any recordkeeping we&apos;re required to maintain.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-navy-deep">Contact</h2>
          <p>
            Questions about this policy can be sent through our{" "}
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
