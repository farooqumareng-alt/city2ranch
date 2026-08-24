import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhyGrid } from "@/components/home/WhyGrid";

export const metadata: Metadata = {
  title: "About",
  description:
    "City2Ranch is a private rural concierge and delivery service built for ranches, estates and rural properties.",
};

export default function AboutPage() {
  return (
    <>
      <Container className="flex flex-col gap-8 py-16 sm:py-24">
        <SectionHeading
          eyebrow="ABOUT CITY2RANCH"
          title="A Private Service for People Who Live Differently."
          description="City2Ranch is a private rural concierge and delivery service. We connect households on ranches, estates and rural properties with the shopping, essentials and everyday conveniences of the city — through a dependable, discreet, appointment-based service rather than an on-demand delivery app."
        />
        <div className="max-w-2xl font-sans text-base leading-relaxed text-charcoal/80">
          <p>
            We&apos;re currently establishing our first select rural routes.
            Rather than claim coverage everywhere from day one, City2Ranch is
            being built route by route, with founding customers helping
            shape where we go next.
          </p>
          <p className="mt-4">
            The result is meant to feel less like a delivery marketplace and
            more like a personal concierge who happens to be in the city
            every day — private, reliable, and built around your schedule.
          </p>
        </div>
      </Container>
      <WhyGrid />
    </>
  );
}
