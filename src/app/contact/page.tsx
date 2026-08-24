import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the City2Ranch concierge team.",
};

export default function ContactPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="CONTACT"
        title="Get in Touch"
        description="Questions about service, routes, or becoming a founding member? Send us a message and a concierge will respond."
      />
      <div className="max-w-2xl">
        <ContactForm />
      </div>
    </Container>
  );
}
