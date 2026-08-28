import type { Metadata } from "next";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShoppingListForm } from "@/components/forms/ShoppingListForm";
import { updateShoppingList } from "@/lib/actions/shopping-lists";
import { getDb } from "@/lib/db";
import { shoppingLists } from "@/lib/db/schema";
import { getShoppingListItems } from "@/lib/shopping-lists";
import { getCommonGroceryItems } from "@/lib/grocery-items";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";

export const metadata: Metadata = { title: "Edit List" };

export default async function EditListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  const [rows, items, groceryItems] = await Promise.all([
    db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.authUserId, ownerId))),
    getShoppingListItems(id),
    getCommonGroceryItems(),
  ]);
  const list = rows[0];
  if (!list) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title={`Edit ${list.name}`} />
      <div className="max-w-2xl">
        <ShoppingListForm
          action={updateShoppingList.bind(null, list.id)}
          list={{ name: list.name, items }}
          groceryItems={groceryItems}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
