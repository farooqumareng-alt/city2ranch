"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

// Address fields are nullable — a store can be a brand only (Walmart,
// H-E-B, ...) with no fixed location; the actual pickup address for a
// given order lives on the order instead (see pickup-address.ts).
export type StoreDefaults = {
  name: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
};

/** Shared create/edit form for the admin Stores screen — same
 *  bound-server-action pattern as PlaceForm (the caller passes either
 *  createStore or updateStore.bind(null, id)). */
export function StoreForm({
  action,
  store,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  store?: StoreDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <TextField
        name="name"
        label="Store name"
        placeholder="e.g. Tractor Supply Co. — Weatherford"
        required
        defaultValue={values?.name ?? store?.name}
        error={fieldErrors?.name}
      />

      <p className="font-sans text-xs text-charcoal/60">
        Address is optional — leave it blank for a brand you support at multiple locations (e.g. Walmart);
        the actual pickup address is captured per order instead, by the customer or a dispatcher.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="addressLine1"
          label="Address"
          className="sm:col-span-2"
          defaultValue={values?.addressLine1 ?? store?.addressLine1 ?? ""}
          error={fieldErrors?.addressLine1}
        />
        <TextField
          name="city"
          label="City"
          defaultValue={values?.city ?? store?.city ?? ""}
          error={fieldErrors?.city}
        />
        <TextField
          name="state"
          label="State"
          defaultValue={values?.state ?? store?.state ?? ""}
          error={fieldErrors?.state}
        />
        <TextField
          name="zip"
          label="ZIP code"
          defaultValue={values?.zip ?? store?.zip ?? ""}
          error={fieldErrors?.zip}
        />
        <TextField
          name="phone"
          label="Phone"
          defaultValue={values?.phone ?? store?.phone ?? ""}
          error={fieldErrors?.phone}
        />
      </div>

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
