"use client";

import { useActionState, useState } from "react";
import { createConciergeOrder } from "@/lib/actions/create-concierge-order";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { GroceryItemPicker, type GroceryItem } from "@/components/forms/GroceryItemPicker";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ItemRow = { itemName: string; quantity: string; notes: string };

const emptyRow = (): ItemRow => ({ itemName: "", quantity: "1", notes: "" });

type SourceRequest = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  shoppingList: string | null;
  requestedDeliveryDate: string | null;
  referralSource: string | null;
};

export function NewConciergeOrderForm({
  serviceRequestId,
  source,
  groceryItems = [],
}: {
  serviceRequestId?: string;
  source?: SourceRequest;
  groceryItems?: GroceryItem[];
}) {
  const [state, formAction, pending] = useActionState(createConciergeOrder, initialState);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const values = state && !state.ok ? state.values : undefined;

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((rows) => [...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  // Fills the last row if it's still blank, rather than always appending —
  // clicking three quick-add chips in a row shouldn't leave two empty
  // rows behind from the default single starting row.
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
    <form action={formAction} className="flex flex-col gap-10">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      {serviceRequestId ? (
        <input type="hidden" name="serviceRequestId" value={serviceRequestId} />
      ) : null}

      {source?.shoppingList ? (
        <div className="rounded-sm border border-navy/10 bg-ivory p-4">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/50">
            Original request (reference only)
          </p>
          <p className="mt-2 whitespace-pre-wrap font-sans text-sm text-charcoal/80">
            {source.shoppingList}
          </p>
          {source.referralSource ? (
            <p className="mt-2 font-sans text-xs font-medium text-gold">Referred by: {source.referralSource}</p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Customer</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="customerName"
            label="Full name"
            required
            defaultValue={values?.customerName ?? source?.name}
            error={fieldErrors?.customerName}
          />
          <TextField
            name="customerEmail"
            type="email"
            label="Email"
            required
            defaultValue={values?.customerEmail ?? source?.email}
            error={fieldErrors?.customerEmail}
          />
          <TextField
            name="customerPhone"
            type="tel"
            label="Phone"
            required
            defaultValue={values?.customerPhone ?? source?.phone}
            error={fieldErrors?.customerPhone}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Delivery Address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="deliveryAddressLine1"
            label="Address"
            required
            className="sm:col-span-2"
            defaultValue={values?.deliveryAddressLine1 ?? source?.addressLine1}
            error={fieldErrors?.deliveryAddressLine1}
          />
          <TextField
            name="deliveryAddressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            defaultValue={values?.deliveryAddressLine2 ?? source?.addressLine2 ?? undefined}
            error={fieldErrors?.deliveryAddressLine2}
          />
          <TextField
            name="deliveryCity"
            label="City"
            required
            defaultValue={values?.deliveryCity ?? source?.city}
            error={fieldErrors?.deliveryCity}
          />
          <TextField
            name="deliveryState"
            label="State"
            required
            defaultValue={values?.deliveryState ?? source?.state}
            error={fieldErrors?.deliveryState}
          />
          <TextField
            name="deliveryZip"
            label="ZIP code"
            required
            defaultValue={values?.deliveryZip ?? source?.zip}
            error={fieldErrors?.deliveryZip}
          />
        </div>
      </fieldset>

      <TextField
        name="requestedDeliveryDate"
        type="date"
        label="Requested delivery date"
        hint="Optional — carried over from the customer's request if they gave one."
        defaultValue={values?.requestedDeliveryDate ?? source?.requestedDeliveryDate ?? undefined}
        error={fieldErrors?.requestedDeliveryDate}
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Shopping List</legend>
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
      </fieldset>

      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <TextareaField
        name="customerNotes"
        label="Notes"
        hint="Gate code, delivery preferences, anything else."
        defaultValue={values?.customerNotes}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create Order & Build Quote"}
      </Button>
    </form>
  );
}
