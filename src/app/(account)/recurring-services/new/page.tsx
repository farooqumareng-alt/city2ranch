import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RecurringServicePlanForm } from "@/components/forms/RecurringServicePlanForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { canPerform, getEffectiveOwnerWithRole } from "@/lib/household";
import { getOwnProfile } from "@/lib/customer-profile";
import { getOwnPlaces } from "@/lib/actions/places";
import { getOwnShoppingListsWithItems } from "@/lib/shopping-lists";

export const metadata: Metadata = {
  title: "New Recurring Request",
  description: "Set up a standing shop-for-you request on a schedule.",
};

export default async function NewRecurringServicePlanPage() {
  const user = await getCurrentUser();
  const effective = user ? await getEffectiveOwnerWithRole(user.id) : null;
  const ownerId = effective?.ownerId ?? null;
  const canManage = effective ? canPerform(effective.role, "place_order") : false;

  const [profile, places, savedLists] = await Promise.all([
    ownerId ? getOwnProfile(ownerId) : Promise.resolve(null),
    ownerId ? getOwnPlaces(ownerId) : Promise.resolve([]),
    ownerId ? getOwnShoppingListsWithItems(ownerId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="New Recurring Request"
        description="Shop for me on a schedule — a concierge builds and prices each order fresh, you approve and pay each one."
      />
      <div className="max-w-2xl">
        {canManage ? (
          <RecurringServicePlanForm profile={profile} places={places} savedLists={savedLists} />
        ) : (
          <p className="font-sans text-sm text-charcoal/70">
            You have view-only access to this account and can&apos;t set up recurring requests.
          </p>
        )}
      </div>
    </div>
  );
}
