"use client";

import { useActionState } from "react";
import { submitOrder } from "@/lib/actions/submit-order";
import { TextField, TextareaField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type Store = { id: string; name: string; city: string; state: string };
type ProfileDefaults = {
  name: string | null;
  phone: string | null;
  defaultDeliveryAddressLine1: string | null;
  defaultDeliveryAddressLine2: string | null;
  defaultDeliveryCity: string | null;
  defaultDeliveryState: string | null;
  defaultDeliveryZip: string | null;
} | null;

export function OrderPickupForm({
  stores,
  profile,
}: {
  stores: Store[];
  profile?: ProfileDefaults;
}) {
  const [state, formAction, pending] = useActionState(submitOrder, initialState);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

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
              label: `${s.name} — ${s.city}, ${s.state}`,
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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="deliveryAddressLine1"
            label="Address"
            required
            className="sm:col-span-2"
            defaultValue={values?.deliveryAddressLine1 ?? profile?.defaultDeliveryAddressLine1 ?? ""}
            error={fieldErrors?.deliveryAddressLine1}
          />
          <TextField
            name="deliveryAddressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            defaultValue={values?.deliveryAddressLine2 ?? profile?.defaultDeliveryAddressLine2 ?? ""}
            error={fieldErrors?.deliveryAddressLine2}
          />
          <TextField
            name="deliveryCity"
            label="City"
            required
            defaultValue={values?.deliveryCity ?? profile?.defaultDeliveryCity ?? ""}
            error={fieldErrors?.deliveryCity}
          />
          <TextField
            name="deliveryState"
            label="State"
            required
            defaultValue={values?.deliveryState ?? profile?.defaultDeliveryState ?? ""}
            error={fieldErrors?.deliveryState}
          />
          <TextField
            name="deliveryZip"
            label="ZIP code"
            required
            defaultValue={values?.deliveryZip ?? profile?.defaultDeliveryZip ?? ""}
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
