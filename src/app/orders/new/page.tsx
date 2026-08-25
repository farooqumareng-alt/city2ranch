import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { OrderPickupForm } from "@/components/forms/OrderPickupForm";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Request a City Pickup",
  description:
    "Already have an order with a supported retailer? Tell us where to pick it up and where to deliver it.",
};

export default async function NewOrderPage() {
  const db = getDb();
  const activeStores = await db
    .select({ id: stores.id, name: stores.name, city: stores.city, state: stores.state })
    .from(stores)
    .where(eq(stores.isActive, true));

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="CITY PICKUP"
        title="Request a City Pickup"
        description="Already placed your own order with a supported retailer? Tell us where to pick it up and where to bring it, and we'll show you the price before anything is charged."
      />
      <div className="max-w-2xl">
        {activeStores.length === 0 ? (
          <p className="font-sans text-sm text-charcoal/70">
            We&apos;re not currently accepting City Pickup requests for any
            store. Please check back soon.
          </p>
        ) : (
          <OrderPickupForm stores={activeStores} />
        )}
      </div>
    </Container>
  );
}
