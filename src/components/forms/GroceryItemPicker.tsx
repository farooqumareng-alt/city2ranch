"use client";

export type GroceryItem = { name: string; category: string };

/**
 * "Quick add" chips for the common-grocery-items reference list, grouped
 * by category in `<details>` sections (native disclosure — no client
 * state needed just to expand/collapse). Purely presentational: the
 * caller decides what a click actually does — append to a free-text
 * shopping list (RequestServiceForm) or push a new structured item row
 * (NewConciergeOrderForm) — via `onAdd`.
 */
export function GroceryItemPicker({
  items,
  onAdd,
}: {
  items: GroceryItem[];
  onAdd: (name: string) => void;
}) {
  if (items.length === 0) return null;

  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const names = byCategory.get(item.category) ?? [];
    names.push(item.name);
    byCategory.set(item.category, names);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/50">
        Quick add common items
      </p>
      <div className="flex flex-col gap-2">
        {[...byCategory.entries()].map(([category, names]) => (
          <details key={category} className="rounded-sm border border-navy/10">
            <summary className="cursor-pointer select-none px-3 py-2 font-sans text-sm font-medium text-navy-deep">
              {category}
            </summary>
            <div className="flex flex-wrap gap-2 px-3 pb-3">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onAdd(name)}
                  className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 font-sans text-xs text-navy-deep transition-colors hover:bg-gold/20"
                >
                  + {name}
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
