"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type StoreDefaults = {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
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

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="addressLine1"
          label="Address"
          required
          className="sm:col-span-2"
          defaultValue={values?.addressLine1 ?? store?.addressLine1}
          error={fieldErrors?.addressLine1}
        />
        <TextField
          name="city"
          label="City"
          required
          defaultValue={values?.city ?? store?.city}
          error={fieldErrors?.city}
        />
        <TextField
          name="state"
          label="State"
          required
          defaultValue={values?.state ?? store?.state}
          error={fieldErrors?.state}
        />
        <TextField
          name="zip"
          label="ZIP code"
          required
          defaultValue={values?.zip ?? store?.zip}
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
