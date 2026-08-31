import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EditGroceryItemForm } from "@/components/forms/GroceryItemForm";
import { updateGroceryItem } from "@/lib/actions/grocery-item-management";
import { getDb } from "@/lib/db";
import { commonGroceryItems } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Grocery Item" };

export default async function EditGroceryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const db = getDb();
  const rows = await db.select().from(commonGroceryItems).where(eq(commonGroceryItems.id, id));
  const item = rows[0];
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="BUSINESS" title={`Edit ${item.name}`} description="Rename this grocery item." />
      <div className="max-w-2xl">
        <EditGroceryItemForm
          action={updateGroceryItem.bind(null, item.id)}
          currentName={item.name}
          category={item.category}
        />
      </div>
    </div>
  );
}
