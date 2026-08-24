import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RequestServiceForm } from "@/components/forms/RequestServiceForm";

export const metadata: Metadata = {
  title: "Request Private Service",
  description:
    "Submit a private service request to City2Ranch — groceries, shopping, essentials and errands delivered to your ranch or rural property.",
};

export default function RequestServicePage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="REQUEST SERVICE"
        title="Request Private Service"
        description="Tell us about your household and what you need. A City2Ranch concierge will follow up with availability and pricing."
      />
      <div className="max-w-2xl">
        <RequestServiceForm />
      </div>
    </Container>
  );
}
