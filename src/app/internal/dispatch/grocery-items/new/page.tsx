import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NewGroceryItemForm } from "@/components/forms/GroceryItemForm";
import { createGroceryItem, listGroceryItems } from "@/lib/actions/grocery-item-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Add Grocery Item" };

export default async function NewGroceryItemPage() {
  await requireStaff();
  const items = await listGroceryItems();
  const existingCategories = [...new Set(items.map((item) => item.category))].sort();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="BUSINESS"
        title="Add Grocery Item"
        description="Adds to the reference list customers pick from on the service-request form."
      />
      <div className="max-w-2xl">
        <NewGroceryItemForm action={createGroceryItem} existingCategories={existingCategories} />
      </div>
    </div>
  );
}
