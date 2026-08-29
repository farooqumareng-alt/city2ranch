import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceForm } from "@/components/forms/PlaceForm";
import { createPlace } from "@/lib/actions/places";
import { getCurrentUser } from "@/lib/supabase/server";
import { canPerform, getEffectiveOwnerWithRole } from "@/lib/household";

export const metadata: Metadata = { title: "Add a Place" };

export default async function NewPlacePage() {
  const user = await getCurrentUser();
  const role = user ? (await getEffectiveOwnerWithRole(user.id)).role : "view_only";

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title="Add a Place" description="Save a property for faster requests." />
      <div className="max-w-2xl">
        {canPerform(role, "manage_places") ? (
          <PlaceForm action={createPlace} submitLabel="Save Place" />
        ) : (
          <p className="font-sans text-sm text-charcoal/70">
            You have view-only access to this account and can&apos;t save places.
          </p>
        )}
      </div>
    </div>
  );
}
