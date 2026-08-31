"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type ZipMileageDefaults = {
  zip: string;
  roundTripMiles: string;
  label: string | null;
};

/** Shared create/edit form for the admin ZIP Coverage screen. The `zip`
 *  field only ever renders on create — orders/recurring plans FK to
 *  zip_mileage.zip by value, so it's immutable once a row exists (see
 *  the doc comment on updateZipMileage in zip-mileage-management.ts). */
export function ZipMileageForm({
  action,
  entry,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  entry?: ZipMileageDefaults;
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

      {entry ? (
        <div className="flex flex-col gap-1.5">
          <p className="font-sans text-sm font-medium text-navy-deep">ZIP code</p>
          <p className="font-sans text-sm text-charcoal/70">
            {entry.zip} — can&apos;t be changed once created. Delete and re-add to cover a different ZIP.
          </p>
        </div>
      ) : (
        <TextField
          name="zip"
          label="ZIP code"
          required
          defaultValue={values?.zip}
          error={fieldErrors?.zip}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="roundTripMiles"
          label="Round-trip miles"
          placeholder="25.0"
          hint="From the pickup hub, there and back — this is the only input a City Pickup price is ever computed from."
          required
          defaultValue={values?.roundTripMiles ?? entry?.roundTripMiles}
          error={fieldErrors?.roundTripMiles}
        />
        <TextField
          name="label"
          label="Label"
          placeholder="e.g. Weatherford"
          hint="Internal reference only."
          defaultValue={values?.label ?? entry?.label ?? ""}
          error={fieldErrors?.label}
        />
      </div>

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
