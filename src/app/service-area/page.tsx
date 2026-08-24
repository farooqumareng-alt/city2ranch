import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ZipCheckForm } from "@/components/forms/ZipCheckForm";

export const metadata: Metadata = {
  title: "Service Area",
  description:
    "Check whether City2Ranch currently serves your ZIP code, or join the waitlist as we build new rural routes.",
};

export default function ServiceAreaPage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-24">
      <SectionHeading
        eyebrow="SERVICE AREA"
        title="Does City2Ranch serve your area?"
        description="Enter your ZIP code to see whether City2Ranch currently serves your community or whether we're building a route near you."
      />

      <div className="max-w-xl">
        <ZipCheckForm />
      </div>

      <div className="max-w-2xl border-t border-navy/10 pt-10">
        <h3 className="font-serif text-xl text-navy-deep">
          We&apos;re Building Routes, Not Just Deliveries.
        </h3>
        <p className="mt-3 font-sans text-sm leading-relaxed text-charcoal/70 sm:text-base">
          City2Ranch creates scheduled rural routes so customers in the same
          region can share access to dependable city-side shopping and
          concierge services. That&apos;s why service is scheduled and
          route-based rather than always instantly on-demand — and why we&apos;re
          currently establishing our first select rural routes rather than
          claiming coverage everywhere.
        </p>
      </div>
    </Container>
  );
}
