"use client";

import { useActionState, useState } from "react";
import { submitServiceRequest } from "@/lib/actions/service-request";
import { TextField, TextareaField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { GroceryItemPicker, type GroceryItem } from "@/components/forms/GroceryItemPicker";
import { SERVICE_TYPE_OPTIONS, TIMING_OPTIONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type SavedList = {
  id: string;
  name: string;
  items: { itemName: string; quantity: string; notes: string | null }[];
};
type Place = {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};
type ProfileDefaults = {
  name: string | null;
  phone: string | null;
} | null;

export function RequestServiceForm({
  groceryItems = [],
  notesPrefill,
  savedLists = [],
  profile,
  places = [],
  userEmail,
  referralSource,
}: {
  groceryItems?: GroceryItem[];
  notesPrefill?: string;
  savedLists?: SavedList[];
  /** Only meaningful for a signed-in customer — /request-service also
   *  works fully signed out, where none of these three are passed. */
  profile?: ProfileDefaults;
  places?: Place[];
  userEmail?: string;
  /** From ?ref=<slug> — e.g. a partner property's "City2Ranch Guest
   *  Delivery" link/QR code. Captured silently, never a visible/editable
   *  field; see schema.ts on service_requests.referralSource. */
  referralSource?: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitServiceRequest,
    initialState
  );
  const values = state && !state.ok ? state.values : undefined;
  const [shoppingList, setShoppingList] = useState(values?.shoppingList ?? "");

  const defaultPlace = places.find((p) => p.isDefault) ?? places[0];
  const [address, setAddress] = useState({
    line1: values?.addressLine1 ?? defaultPlace?.addressLine1 ?? "",
    line2: values?.addressLine2 ?? defaultPlace?.addressLine2 ?? "",
    city: values?.city ?? defaultPlace?.city ?? "",
    state: values?.state ?? defaultPlace?.state ?? "",
    zip: values?.zip ?? defaultPlace?.zip ?? "",
  });

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

  function loadSavedList(listId: string) {
    const list = savedLists.find((l) => l.id === listId);
    if (!list) return;
    const text = list.items
      .map((item) => (item.quantity && item.quantity !== "1" ? `${item.itemName} — ${item.quantity}` : item.itemName))
      .join("\n");
    setShoppingList((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n${text}` : text;
    });
  }

  if (state?.ok) {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-8">
        <p className="font-serif text-xl text-navy-deep">Thank you.</p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          A City2Ranch concierge will review your request and contact you
          with availability and pricing.
        </p>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  function addToShoppingList(name: string) {
    setShoppingList((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n${name}` : name;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <input type="hidden" name="referralSource" value={values?.referralSource ?? referralSource ?? ""} />
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Customer</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label="Full name"
            required
            defaultValue={values?.name ?? profile?.name ?? ""}
            error={fieldErrors?.name}
          />
          <TextField
            name="email"
            type="email"
            label="Email"
            required
            defaultValue={values?.email ?? userEmail ?? ""}
            error={fieldErrors?.email}
          />
          <TextField
            name="phone"
            type="tel"
            label="Phone"
            required
            defaultValue={values?.phone ?? profile?.phone ?? ""}
            error={fieldErrors?.phone}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Location</legend>
        {places.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="request-place-picker" className="font-sans text-sm font-medium text-navy-deep">
              Use a saved place
            </label>
            <select
              id="request-place-picker"
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
            name="addressLine1"
            label="Address"
            required
            className="sm:col-span-2"
            value={address.line1}
            onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
            error={fieldErrors?.addressLine1}
          />
          <TextField
            name="addressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            value={address.line2}
            onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
            error={fieldErrors?.addressLine2}
          />
          <TextField
            name="city"
            label="City"
            required
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            error={fieldErrors?.city}
          />
          <TextField
            name="state"
            label="State"
            required
            value={address.state}
            onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            error={fieldErrors?.state}
          />
          <TextField
            name="zip"
            label="ZIP code"
            required
            value={address.zip}
            onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
            error={fieldErrors?.zip}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Service</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="serviceType"
            label="Service type"
            required
            defaultValue={values?.serviceType}
            options={SERVICE_TYPE_OPTIONS}
            error={fieldErrors?.serviceType}
          />
          <TextField
            name="preferredStore"
            label="Preferred store"
            defaultValue={values?.preferredStore}
            error={fieldErrors?.preferredStore}
          />
        </div>
        {savedLists.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="saved-list-picker" className="font-sans text-sm font-medium text-navy-deep">
              Load a saved list
            </label>
            <select
              id="saved-list-picker"
              onChange={(e) => {
                loadSavedList(e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
              className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
            >
              <option value="">— Choose a list —</option>
              {savedLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <TextareaField
          name="shoppingList"
          label="Shopping list"
          value={shoppingList}
          onChange={(e) => setShoppingList(e.target.value)}
          error={fieldErrors?.shoppingList}
        />
        <GroceryItemPicker items={groceryItems} onAdd={addToShoppingList} />
        <TextField
          name="estimatedOrderValue"
          label="Estimated order value"
          placeholder="e.g. $150"
          defaultValue={values?.estimatedOrderValue}
          error={fieldErrors?.estimatedOrderValue}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Timing</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="timingPreference"
            label="Timing preference"
            required
            defaultValue={values?.timingPreference}
            options={TIMING_OPTIONS}
            error={fieldErrors?.timingPreference}
          />
          <TextField
            name="requestedDeliveryDate"
            type="date"
            label="Preferred delivery date"
            hint="Optional — let us know if you need it by a specific date."
            defaultValue={values?.requestedDeliveryDate}
            error={fieldErrors?.requestedDeliveryDate}
          />
        </div>
      </fieldset>

      <TextareaField
        name="notes"
        label="Notes"
        hint="Anything else your concierge should know."
        defaultValue={values?.notes ?? notesPrefill}
        error={fieldErrors?.notes}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Submit Private Service Request"}
      </Button>
    </form>
  );
}
