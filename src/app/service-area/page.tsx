import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ZipCheckForm } from "@/components/forms/ZipCheckForm";
import { SERVICE_AREAS } from "@/data/service-areas";
import { pageSeo } from "@/lib/seo";

const TITLE = "Service Area";
const DESCRIPTION =
  "Check whether City2Ranch currently serves your ZIP code, or join the waitlist as we build new rural routes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageSeo({ path: "/service-area", title: TITLE, description: DESCRIPTION }),
};

export default function ServiceAreaPage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-24">
      <SectionHeading
        eyebrow="SERVICE AREA"
        title="Does City2Ranch serve your area?"
        level="h1"
        description="Enter your ZIP code to see whether City2Ranch currently serves your community or whether we're building a route near you."
      />

      <div className="max-w-xl">
        <ZipCheckForm />
      </div>

      <div className="max-w-2xl border-t border-navy/10 pt-10">
        <h2 className="font-serif text-xl text-navy-deep">
          We&apos;re Building Routes, Not Just Deliveries.
        </h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-charcoal/70 sm:text-base">
          City2Ranch creates scheduled rural routes so customers in the same
          region can share access to dependable city-side shopping and
          concierge services. That&apos;s why service is scheduled and
          route-based rather than always instantly on-demand — and why we&apos;re
          currently establishing our first select rural routes rather than
          claiming coverage everywhere.
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-charcoal/70 sm:text-base">
          Each route runs on a recurring weekly schedule: our concierge shops
          your groceries, household essentials, hardware, pet supplies and
          special requests in town, then delivers everything to your ranch,
          estate or rural property during your preferred delivery window.
          Founding members in the same region help shape where each new route
          goes next — enter your ZIP code above to check your community or
          join the waitlist for an upcoming route.
        </p>
      </div>

      <div className="border-t border-navy/10 pt-10">
        <SectionHeading
          eyebrow="LAUNCH AREAS"
          title="Explore our launch communities."
          description="Each community below has its own page with route details, services, and answers to common questions."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_AREAS.map((area) => (
            <Link
              key={area.slug}
              href={`/service-area/${area.slug}`}
              className="group flex flex-col gap-2 rounded-sm border border-navy/10 p-6 transition-colors hover:border-gold"
            >
              <h3 className="font-serif text-xl text-navy-deep group-hover:text-gold">
                {area.name}, {area.state} {area.zip}
              </h3>
              <p className="font-sans text-sm leading-relaxed text-charcoal/70">
                {area.tagline}
              </p>
              <span className="mt-2 font-sans text-sm font-medium text-navy">
                View area details →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}
