import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NewConciergeOrderForm } from "@/components/dispatch/NewConciergeOrderForm";
import { getDb } from "@/lib/db";
import { serviceRequests } from "@/lib/db/schema";

export const metadata: Metadata = { title: "New Concierge Order" };

export default async function NewConciergeOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequest?: string }>;
}) {
  const { fromRequest } = await searchParams;

  let source;
  if (fromRequest) {
    const db = getDb();
    const rows = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, fromRequest));
    source = rows[0];
  }

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="New Concierge Order"
        description={
          source
            ? "Pre-filled from the customer's original request. Review, then build the structured shopping list."
            : "For phone-only intake, or any concierge request not already captured on the site."
        }
      />
      <div className="max-w-2xl">
        <NewConciergeOrderForm
          serviceRequestId={source?.id}
          source={
            source
              ? {
                  name: source.name,
                  email: source.email,
                  phone: source.phone,
                  addressLine1: source.addressLine1,
                  addressLine2: source.addressLine2,
                  city: source.city,
                  state: source.state,
                  zip: source.zip,
                  shoppingList: source.shoppingList,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
