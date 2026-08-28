import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the City2Ranch concierge team.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  // No new lead-capture table for partner inquiries yet — reuses the
  // existing contact_messages pipeline staff already monitors, tagged by
  // subject so they're easy to spot and triage separately.
  const subjectPrefill = topic === "partnership" ? "Partnership Inquiry" : undefined;

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="CONTACT"
        title="Get in Touch"
        description="Questions about service, routes, or becoming a founding member? Send us a message and a concierge will respond."
      />
      <div className="max-w-2xl">
        <ContactForm subjectPrefill={subjectPrefill} />
      </div>
    </Container>
  );
}
