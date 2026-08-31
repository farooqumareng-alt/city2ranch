import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ZipMileageForm } from "@/components/forms/ZipMileageForm";
import { createZipMileage } from "@/lib/actions/zip-mileage-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Add ZIP" };

export default async function NewZipMileagePage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="BUSINESS" title="Add ZIP" description="Extend delivery coverage to a new ZIP code." />
      <div className="max-w-2xl">
        <ZipMileageForm action={createZipMileage} submitLabel="Save ZIP" />
      </div>
    </div>
  );
}
