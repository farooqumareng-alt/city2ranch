"use client";

import { useActionState } from "react";
import { submitDriverApplication } from "@/lib/actions/driver-application";
import { TextField, TextareaField, CheckboxField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/** Same structure as FoundingAccessForm.tsx — useActionState, a success-
 *  state swap, a grid of fields. */
export function DriverApplicationForm() {
  const [state, formAction, pending] = useActionState(submitDriverApplication, initialState);

  if (state?.ok) {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
        <p className="font-serif text-lg text-navy-deep">Thank you for applying.</p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          A City2Ranch team member will review your application and reach out if it&apos;s a fit.
        </p>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Full name" required defaultValue={values?.name} error={fieldErrors?.name} />
        <TextField
          name="email"
          type="email"
          label="Email"
          required
          defaultValue={values?.email}
          error={fieldErrors?.email}
        />
        <TextField
          name="phone"
          type="tel"
          label="Phone"
          required
          defaultValue={values?.phone}
          error={fieldErrors?.phone}
        />
        <TextField name="city" label="City" required defaultValue={values?.city} error={fieldErrors?.city} />
        <TextField name="zip" label="ZIP code" required defaultValue={values?.zip} error={fieldErrors?.zip} />
        <TextField
          name="vehicle"
          label="Your vehicle"
          placeholder="Year, make, and model"
          required
          defaultValue={values?.vehicle}
          error={fieldErrors?.vehicle}
        />
        <TextField
          name="availability"
          label="Availability"
          placeholder="e.g. Weekday afternoons"
          defaultValue={values?.availability}
          error={fieldErrors?.availability}
        />
      </div>
      <TextareaField
        name="motivation"
        label="Why do you want to drive for City2Ranch?"
        defaultValue={values?.motivation}
        error={fieldErrors?.motivation}
      />
      <CheckboxField
        name="hasLicenseAndInsurance"
        label="I have a valid driver's license and current auto insurance."
        required
        defaultChecked={values?.hasLicenseAndInsurance === "on"}
        error={fieldErrors?.hasLicenseAndInsurance}
      />
      <Button type="submit" variant="gold" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}
