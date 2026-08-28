import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { getOwnShoppingLists } from "@/lib/shopping-lists";
import { deleteShoppingList } from "@/lib/actions/shopping-lists";

export const metadata: Metadata = {
  title: "My Lists",
  description: "Save a shopping list once, reuse it on future requests.",
};

export default async function ListsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const lists = await getOwnShoppingLists(ownerId);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="My Lists"
          description="Save a shopping list once, then load it straight into a new request instead of retyping it."
        />
        <Button href="/lists/new" variant="navy">
          New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">You haven&apos;t saved a list yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {lists.map((list) => (
            <div key={list.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <p className="font-serif text-base text-navy-deep">{list.name}</p>
              <div className="flex gap-3">
                <Button href={`/lists/${list.id}`} variant="outline-dark" size="md">
                  Edit
                </Button>
                <form action={deleteShoppingList.bind(null, list.id)}>
                  <Button type="submit" variant="outline-dark" size="md">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
