import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShoppingListForm } from "@/components/forms/ShoppingListForm";
import { createShoppingList } from "@/lib/actions/shopping-lists";
import { getCommonGroceryItems } from "@/lib/grocery-items";

export const metadata: Metadata = { title: "New List" };

export default async function NewListPage() {
  const groceryItems = await getCommonGroceryItems();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title="New List" />
      <div className="max-w-2xl">
        <ShoppingListForm action={createShoppingList} groceryItems={groceryItems} submitLabel="Save List" />
      </div>
    </div>
  );
}
