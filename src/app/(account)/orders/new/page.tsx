import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { OrderPickupForm } from "@/components/forms/OrderPickupForm";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/actions/update-profile";
import { getOwnPlaces } from "@/lib/actions/places";

export const metadata: Metadata = {
  title: "Request a City Pickup",
  description:
    "Already have an order with a supported retailer? Tell us where to pick it up and where to deliver it.",
};

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const [activeStores, profile, places] = await Promise.all([
    db
      .select({ id: stores.id, name: stores.name, city: stores.city, state: stores.state })
      .from(stores)
      .where(eq(stores.isActive, true)),
    user ? getOwnProfile(user.id) : Promise.resolve(null),
    user ? getOwnPlaces(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-10">
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
          <OrderPickupForm stores={activeStores} profile={profile} places={places} />
        )}
      </div>
    </div>
  );
}
