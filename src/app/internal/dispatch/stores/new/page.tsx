import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StoreForm } from "@/components/forms/StoreForm";
import { createStore } from "@/lib/actions/store-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Add Store" };

export default async function NewStorePage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="BUSINESS"
        title="Add Store"
        description="A new pickup location for City Pickup orders."
      />
      <div className="max-w-2xl">
        <StoreForm action={createStore} submitLabel="Save Store" />
      </div>
    </div>
  );
}
