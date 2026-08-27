import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RequestServiceForm } from "@/components/forms/RequestServiceForm";
import { getCommonGroceryItems } from "@/lib/grocery-items";

export const metadata: Metadata = {
  title: "Request Private Service",
  description:
    "Submit a private service request to City2Ranch — groceries, shopping, essentials and errands delivered to your ranch or rural property.",
};

export default async function RequestServicePage() {
  const groceryItems = await getCommonGroceryItems();

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="REQUEST SERVICE"
        title="Request Private Service"
        description="Tell us about your household and what you need. A City2Ranch concierge will follow up with availability and pricing."
      />
      <div className="max-w-2xl">
        <RequestServiceForm groceryItems={groceryItems} />
      </div>
    </Container>
  );
}
