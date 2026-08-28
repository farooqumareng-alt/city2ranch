import type { Metadata } from "next";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceForm } from "@/components/forms/PlaceForm";
import { updatePlace } from "@/lib/actions/places";
import { getDb } from "@/lib/db";
import { customerPlaces } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";

export const metadata: Metadata = { title: "Edit Place" };

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  const rows = await db
    .select()
    .from(customerPlaces)
    .where(and(eq(customerPlaces.id, id), eq(customerPlaces.authUserId, ownerId)));
  const place = rows[0];
  if (!place) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title={`Edit ${place.label}`} description="Update this place's details." />
      <div className="max-w-2xl">
        <PlaceForm action={updatePlace.bind(null, place.id)} place={place} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
