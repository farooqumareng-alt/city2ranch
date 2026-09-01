"use client";

import { useActionState, useState } from "react";
import { submitOrder } from "@/lib/actions/submit-order";
import { TextField, TextareaField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

// city/state can be null — a store may be a supported brand with no
// single fixed address; the dropdown label below falls back to the
// name alone in that case.
type Store = { id: string; name: string; city: string | null; state: string | null };
type ProfileDefaults = {
  name: string | null;
  phone: string | null;
  defaultDeliveryAddressLine1: string | null;
  defaultDeliveryAddressLine2: string | null;
  defaultDeliveryCity: string | null;
  defaultDeliveryState: string | null;
  defaultDeliveryZip: string | null;
} | null;
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

export function OrderPickupForm({
  stores,
  profile,
  places = [],
}: {
  stores: Store[];
  profile?: ProfileDefaults;
  places?: Place[];
}) {
  const [state, formAction, pending] = useActionState(submitOrder, initialState);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  const defaultPlace = places.find((p) => p.isDefault) ?? places[0];
  const [address, setAddress] = useState({
    line1: values?.deliveryAddressLine1 ?? defaultPlace?.addressLine1 ?? profile?.defaultDeliveryAddressLine1 ?? "",
    line2: values?.deliveryAddressLine2 ?? defaultPlace?.addressLine2 ?? profile?.defaultDeliveryAddressLine2 ?? "",
    city: values?.deliveryCity ?? defaultPlace?.city ?? profile?.defaultDeliveryCity ?? "",
    state: values?.deliveryState ?? defaultPlace?.state ?? profile?.defaultDeliveryState ?? "",
    zip: values?.deliveryZip ?? defaultPlace?.zip ?? profile?.defaultDeliveryZip ?? "",
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

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Your Order</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="storeId"
            label="Store"
            required
            defaultValue={values?.storeId}
            options={stores.map((s) => ({
              value: s.id,
              label: s.city && s.state ? `${s.name} — ${s.city}, ${s.state}` : s.name,
            }))}
            error={fieldErrors?.storeId}
          />
          <TextField
            name="retailerOrderNumber"
            label="Order / confirmation number"
            required
            defaultValue={values?.retailerOrderNumber}
            error={fieldErrors?.retailerOrderNumber}
          />
        </div>
        <TextareaField
          name="pickupNotes"
          label="Pickup notes"
          hint="Anything the driver should know when picking up (e.g. curbside pickup instructions)."
          defaultValue={values?.pickupNotes}
          error={fieldErrors?.pickupNotes}
        />
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

      <TextField
        name="requestedDeliveryDate"
        type="date"
        label="Preferred delivery date"
        hint="Optional — let us know if you need it by a specific date."
        defaultValue={values?.requestedDeliveryDate}
        error={fieldErrors?.requestedDeliveryDate}
      />

      <TextareaField
        name="customerNotes"
        label="Notes"
        hint="Gate code, delivery preferences, anything else."
        defaultValue={values?.customerNotes}
        error={fieldErrors?.customerNotes}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "See Price & Continue"}
      </Button>
    </form>
  );
}
