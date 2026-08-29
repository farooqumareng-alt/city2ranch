"use client";

import { useActionState, useState } from "react";
import { createRecurringServicePlan } from "@/lib/actions/recurring-service-plans";
import { TextField, TextareaField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ItemRow = { itemName: string; quantity: string; notes: string };
const emptyRow = (): ItemRow => ({ itemName: "", quantity: "1", notes: "" });

type ProfileDefaults = { name: string | null; phone: string | null } | null;
type Place = {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
};
type SavedList = { id: string; name: string; items: { itemName: string; quantity: string; notes: string | null }[] };

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Every month" },
];

export function RecurringServicePlanForm({
  profile,
  places = [],
  savedLists = [],
}: {
  profile?: ProfileDefaults;
  places?: Place[];
  savedLists?: SavedList[];
}) {
  const [state, formAction, pending] = useActionState(createRecurringServicePlan, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  const [address, setAddress] = useState({
    line1: values?.deliveryAddressLine1 ?? "",
    line2: values?.deliveryAddressLine2 ?? "",
    city: values?.deliveryCity ?? "",
    state: values?.deliveryState ?? "",
    zip: values?.deliveryZip ?? "",
  });
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);

  function applyPlace(placeId: string) {
    const place = places.find((p) => p.id === placeId);
    if (!place) return;
    setAddress({
      line1: place.addressLine1,
      line2: place.addressLine2 ?? "",
      city: place.city,
      state: place.state,
      zip: place.zip,
    });
  }

  // One-time copy into this form's own item rows, same "prefill, then
  // independent" relationship every saved-list/place picker in this app
  // already has to the form it fills — editing the saved list later
  // never reaches back into a plan that already copied from it.
  function applyList(listId: string) {
    const list = savedLists.find((l) => l.id === listId);
    if (!list || list.items.length === 0) return;
    setItems(list.items.map((item) => ({ itemName: item.itemName, quantity: item.quantity, notes: item.notes ?? "" })));
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setItems((rows) => [...rows, emptyRow()]);
  }
  function removeRow(index: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Schedule</legend>
        <SelectField
          name="frequency"
          label="How often"
          required
          defaultValue={values?.frequency}
          options={FREQUENCY_OPTIONS}
          error={fieldErrors?.frequency}
          className="max-w-xs"
        />
        <p className="font-sans text-xs text-charcoal/60">
          Starts right away — the first order will be created shortly after you set this up, and each
          one afterward on this schedule. Every order still needs your review and approval before
          anything is charged; this never charges you automatically.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="customerName"
            label="Full name"
            required
            defaultValue={values?.customerName ?? profile?.name ?? ""}
            error={fieldErrors?.customerName}
          />
          <TextField
            name="customerPhone"
            type="tel"
            label="Phone"
            required
            defaultValue={values?.customerPhone ?? profile?.phone ?? ""}
            error={fieldErrors?.customerPhone}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Delivery Address</legend>
        {places.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="place-picker" className="font-sans text-sm font-medium text-navy-deep">
              Use a saved place
            </label>
            <select
              id="place-picker"
              onChange={(e) => applyPlace(e.target.value)}
              defaultValue=""
              className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
            >
              <option value="">— Enter manually —</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="deliveryAddressLine1"
            label="Address"
            required
            className="sm:col-span-2"
            value={address.line1}
            onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
            error={fieldErrors?.deliveryAddressLine1}
          />
          <TextField
            name="deliveryAddressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            value={address.line2}
            onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
            error={fieldErrors?.deliveryAddressLine2}
          />
          <TextField
            name="deliveryCity"
            label="City"
            required
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            error={fieldErrors?.deliveryCity}
          />
          <TextField
            name="deliveryState"
            label="State"
            required
            value={address.state}
            onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            error={fieldErrors?.deliveryState}
          />
          <TextField
            name="deliveryZip"
            label="ZIP code"
            required
            value={address.zip}
            onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
            error={fieldErrors?.deliveryZip}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Shopping List</legend>
        {savedLists.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="list-picker" className="font-sans text-sm font-medium text-navy-deep">
              Start from a saved list
            </label>
            <select
              id="list-picker"
              onChange={(e) => applyList(e.target.value)}
              defaultValue=""
              className="w-full max-w-xs rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
            >
              <option value="">— Build below —</option>
              {savedLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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
        hint="Gate code, delivery preferences, anything else that applies every time."
        defaultValue={values?.customerNotes}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Setting up…" : "Set Up Recurring Request"}
      </Button>
    </form>
  );
}
