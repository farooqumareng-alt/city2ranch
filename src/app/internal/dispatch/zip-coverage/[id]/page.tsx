import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ZipMileageForm } from "@/components/forms/ZipMileageForm";
import { updateZipMileage } from "@/lib/actions/zip-mileage-management";
import { getDb } from "@/lib/db";
import { zipMileage } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit ZIP" };

export default async function EditZipMileagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const db = getDb();
  const rows = await db.select().from(zipMileage).where(eq(zipMileage.id, id));
  const entry = rows[0];
  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="BUSINESS" title={`Edit ${entry.zip}`} description="Update this ZIP's mileage or label." />
      <div className="max-w-2xl">
        <ZipMileageForm action={updateZipMileage.bind(null, entry.id)} entry={entry} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
