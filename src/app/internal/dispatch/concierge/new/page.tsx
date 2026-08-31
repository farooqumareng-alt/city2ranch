import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NewConciergeOrderForm } from "@/components/dispatch/NewConciergeOrderForm";
import { getDb } from "@/lib/db";
import { serviceRequests } from "@/lib/db/schema";
import { getCommonGroceryItems } from "@/lib/grocery-items";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "New Concierge Order" };

export default async function NewConciergeOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRequest?: string }>;
}) {
  // Re-checked here, not just relied on via DispatchLayout — this page
  // can look up a specific customer's service request directly, with
  // no other gate of its own before this fix.
  await requireStaff();
  const { fromRequest } = await searchParams;

  let source;
  const [rows, groceryItems] = await Promise.all([
    fromRequest
      ? getDb().select().from(serviceRequests).where(eq(serviceRequests.id, fromRequest))
      : Promise.resolve([]),
    getCommonGroceryItems(),
  ]);
  if (fromRequest) source = rows[0];

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
          groceryItems={groceryItems}
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
                  requestedDeliveryDate: source.requestedDeliveryDate,
                  referralSource: source.referralSource,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
