import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RequestServiceForm } from "@/components/forms/RequestServiceForm";
import { getCommonGroceryItems } from "@/lib/grocery-items";
import { SERVICE_TIERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Request Private Service",
  description:
    "Submit a private service request to City2Ranch — groceries, shopping, essentials and errands delivered to your ranch or rural property.",
};

// The grocery-items quick-add list is live, editable DB data (see
// src/lib/grocery-items.ts) — force this page to render per-request
// rather than let Next.js try to prerender it as static at build time,
// which would both freeze that list into the build and require a
// database connection to be reachable during the build step itself.
export const dynamic = "force-dynamic";

export default async function RequestServicePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const groceryItems = await getCommonGroceryItems();
  // Membership tiers (see the account /membership page and the homepage
  // ServiceTiers section) aren't a real billed product yet — "requesting"
  // one is just this form with a note tagging which tier the customer is
  // interested in, so staff sees it in the same pipeline as every other
  // request. No fake plan/pricing logic anywhere.
  const matchedTier = SERVICE_TIERS.find((t) => t.key === tier);
  const notesPrefill = matchedTier
    ? `Membership interest: ${matchedTier.name} (${matchedTier.subtitle})`
    : undefined;

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="REQUEST SERVICE"
        title="Request Private Service"
        description="Tell us about your household and what you need. A City2Ranch concierge will follow up with availability and pricing."
      />
      <div className="max-w-2xl">
        <RequestServiceForm groceryItems={groceryItems} notesPrefill={notesPrefill} />
      </div>
    </Container>
  );
}
