import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StoreForm } from "@/components/forms/StoreForm";
import { updateStore } from "@/lib/actions/store-management";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Store" };

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const db = getDb();
  const rows = await db.select().from(stores).where(eq(stores.id, id));
  const store = rows[0];
  if (!store) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="BUSINESS" title={`Edit ${store.name}`} description="Update this store's details." />
      <div className="max-w-2xl">
        <StoreForm action={updateStore.bind(null, store.id)} store={store} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
