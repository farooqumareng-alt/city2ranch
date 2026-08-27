import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceForm } from "@/components/forms/PlaceForm";
import { createPlace } from "@/lib/actions/places";

export const metadata: Metadata = { title: "Add a Place" };

export default function NewPlacePage() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title="Add a Place" description="Save a property for faster requests." />
      <div className="max-w-2xl">
        <PlaceForm action={createPlace} submitLabel="Save Place" />
      </div>
    </div>
  );
}
