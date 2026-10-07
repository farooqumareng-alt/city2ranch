import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DriverApplicationForm } from "@/components/forms/DriverApplicationForm";

export const metadata: Metadata = {
  title: "Drive With Us",
  description: "Apply to drive for City2Ranch — use your own vehicle, set your own schedule, serve your community.",
};

export default function DrivePage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-24">
      <SectionHeading
        eyebrow="DRIVE WITH US"
        title="Deliver for City2Ranch"
        description="We're looking for reliable drivers to serve rural routes between town and the ranch. Use your own vehicle, set your own schedule, and help neighbors get what they need."
      />

      <div className="max-w-2xl">
        <DriverApplicationForm />
      </div>

      <div className="max-w-2xl border-t border-navy/10 pt-10">
        <h3 className="font-serif text-xl text-navy-deep">What to expect</h3>
        <p className="mt-3 font-sans text-sm leading-relaxed text-charcoal/70 sm:text-base">
          City2Ranch drivers handle City Pickup and Concierge deliveries on scheduled rural routes — picking up
          from stores in town and delivering out to ranch and rural properties. You&apos;ll use your own vehicle, and
          jobs are offered through the driver app so you can accept what fits your schedule. After you apply, a
          City2Ranch team member will follow up by phone or email to go over the details.
        </p>
      </div>
    </Container>
  );
}
