"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { GroceryItemPicker, type GroceryItem } from "@/components/forms/GroceryItemPicker";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ItemRow = { itemName: string; quantity: string; notes: string };
const emptyRow = (): ItemRow => ({ itemName: "", quantity: "1", notes: "" });

export type ShoppingListDefaults = {
  name: string;
  items: { itemName: string; quantity: string; notes: string | null }[];
};

/**
 * Shared create/edit form for saved shopping lists — same dynamic-row +
 * hidden-JSON-input pattern as NewConciergeOrderForm's shopping list,
 * and the same bound-server-action pattern (createShoppingList directly,
 * or updateShoppingList bound to an id) as PlaceForm.
 */
export function ShoppingListForm({
  action,
  list,
  groceryItems = [],
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  list?: ShoppingListDefaults;
  groceryItems?: GroceryItem[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const [items, setItems] = useState<ItemRow[]>(
    list?.items.length
      ? list.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity, notes: i.notes ?? "" }))
      : [emptyRow()]
  );

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((rows) => [...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  function quickAddItem(name: string) {
    setItems((rows) => {
      const last = rows[rows.length - 1];
      if (last && last.itemName.trim() === "") {
        return rows.map((row, i) => (i === rows.length - 1 ? { ...row, itemName: name } : row));
      }
      return [...rows, { itemName: name, quantity: "1", notes: "" }];
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <TextField
        name="name"
        label="List name"
        placeholder="e.g. Weekly Groceries"
        required
        defaultValue={list?.name}
      />

      <div className="flex flex-col gap-3">
        {items.map((row, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
            <TextField
              name={`item-name-${index}`}
              label="Item"
              required
              value={row.itemName}
              onChange={(e) => updateItem(index, { itemName: e.target.value })}
            />
            <TextField
              name={`item-qty-${index}`}
              label="Quantity"
              placeholder="3, 2 lbs, 1 dozen…"
              required
              value={row.quantity}
              onChange={(e) => updateItem(index, { quantity: e.target.value })}
            />
            <TextField
              name={`item-notes-${index}`}
              label="Notes / brand preference"
              value={row.notes}
              onChange={(e) => updateItem(index, { notes: e.target.value })}
            />
            <Button
              type="button"
              variant="outline-dark"
              onClick={() => removeRow(index)}
              disabled={items.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline-dark" className="self-start" onClick={addRow}>
        Add Item
      </Button>
      <GroceryItemPicker items={groceryItems} onAdd={quickAddItem} />
      {fieldErrors?.itemsJson ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {fieldErrors.itemsJson}
        </p>
      ) : null}

      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
