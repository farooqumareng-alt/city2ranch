"use client";

import { useActionState } from "react";
import { submitServiceRequest } from "@/lib/actions/service-request";
import { TextField, TextareaField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { SERVICE_TYPE_OPTIONS, TIMING_OPTIONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function RequestServiceForm() {
  const [state, formAction, pending] = useActionState(
    submitServiceRequest,
    initialState
  );

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

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Customer</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Full name" required error={fieldErrors?.name} />
          <TextField name="email" type="email" label="Email" required error={fieldErrors?.email} />
          <TextField name="phone" type="tel" label="Phone" required error={fieldErrors?.phone} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Location</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="addressLine1"
            label="Address"
            required
            className="sm:col-span-2"
            error={fieldErrors?.addressLine1}
          />
          <TextField
            name="addressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            error={fieldErrors?.addressLine2}
          />
          <TextField name="city" label="City" required error={fieldErrors?.city} />
          <TextField name="state" label="State" required error={fieldErrors?.state} />
          <TextField name="zip" label="ZIP code" required error={fieldErrors?.zip} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Service</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="serviceType"
            label="Service type"
            required
            options={SERVICE_TYPE_OPTIONS}
            error={fieldErrors?.serviceType}
          />
          <TextField
            name="preferredStore"
            label="Preferred store"
            error={fieldErrors?.preferredStore}
          />
        </div>
        <TextareaField
          name="shoppingList"
          label="Shopping list"
          error={fieldErrors?.shoppingList}
        />
        <TextField
          name="estimatedOrderValue"
          label="Estimated order value"
          placeholder="e.g. $150"
          error={fieldErrors?.estimatedOrderValue}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Timing</legend>
        <SelectField
          name="timingPreference"
          label="Timing preference"
          required
          options={TIMING_OPTIONS}
          error={fieldErrors?.timingPreference}
        />
      </fieldset>

      <TextareaField
        name="notes"
        label="Notes"
        hint="Anything else your concierge should know."
        error={fieldErrors?.notes}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Submit Private Service Request"}
      </Button>
    </form>
  );
}
