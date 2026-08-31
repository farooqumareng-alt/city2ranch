import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { listGroceryItems, deleteGroceryItem } from "@/lib/actions/grocery-item-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Grocery Items" };

export default async function GroceryItemsPage() {
  await requireStaff();
  const items = await listGroceryItems();

  // Rows already arrive ordered so every category's items are
  // contiguous (sortOrder is one running sequence, not reset per
  // category — see the schema doc comment) — a new section starts
  // whenever the category changes, no client-side grouping needed.
  const sections: { category: string; items: typeof items }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.category === item.category) {
      last.items.push(item);
    } else {
      sections.push({ category: item.category, items: [item] });
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="Grocery Items"
          description="The reference list customers pick from when building a shopping list on the service-request form."
        />
        <Button href="/internal/dispatch/grocery-items/new" variant="navy">
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No grocery items yet." />
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.category} className="flex flex-col gap-3">
              <h3 className="font-serif text-lg text-navy-deep">{section.category}</h3>
              <RowList>
                {section.items.map((item) => (
                  <Row key={item.id}>
                    <Link
                      href={`/internal/dispatch/grocery-items/${item.id}`}
                      className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                    >
                      {item.name}
                    </Link>
                    <form action={deleteGroceryItem.bind(null, item.id)}>
                      <Button type="submit" variant="outline-dark" size="md">
                        Delete
                      </Button>
                    </form>
                  </Row>
                ))}
              </RowList>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
