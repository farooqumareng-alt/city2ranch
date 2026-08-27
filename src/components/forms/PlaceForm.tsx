"use client";

import { useActionState } from "react";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type PlaceDefaults = {
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  deliveryInstructions: string | null;
};

/**
 * Shared create/edit form for "My Places" — the caller passes either
 * createPlace directly or updatePlace bound to an id (same
 * bound-server-action pattern as approveAndPayOrder/reopenConciergeQuote
 * elsewhere in this app), so this component doesn't need to know which
 * mode it's in beyond what label to put on the submit button.
 */
export function PlaceForm({
  action,
  place,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  place?: PlaceDefaults;
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
        name="label"
        label="Place name"
        placeholder="e.g. Ranch, Lake House, Guest House"
        required
        defaultValue={values?.label ?? place?.label}
        error={fieldErrors?.label}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="addressLine1"
          label="Address"
          required
          className="sm:col-span-2"
          defaultValue={values?.addressLine1 ?? place?.addressLine1}
          error={fieldErrors?.addressLine1}
        />
        <TextField
          name="addressLine2"
          label="Address line 2"
          className="sm:col-span-2"
          defaultValue={values?.addressLine2 ?? place?.addressLine2 ?? ""}
          error={fieldErrors?.addressLine2}
        />
        <TextField
          name="city"
          label="City"
          required
          defaultValue={values?.city ?? place?.city}
          error={fieldErrors?.city}
        />
        <TextField
          name="state"
          label="State"
          required
          defaultValue={values?.state ?? place?.state}
          error={fieldErrors?.state}
        />
        <TextField
          name="zip"
          label="ZIP code"
          required
          defaultValue={values?.zip ?? place?.zip}
          error={fieldErrors?.zip}
        />
      </div>

      <TextareaField
        name="deliveryInstructions"
        label="Delivery instructions"
        hint="Gate code, access notes, where to leave deliveries — anything a driver should know at this place."
        defaultValue={values?.deliveryInstructions ?? place?.deliveryInstructions ?? ""}
        error={fieldErrors?.deliveryInstructions}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
