"use client";

import { useActionState } from "react";
import { submitFoundingMember } from "@/lib/actions/founding-member";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function FoundingAccessForm() {
  const [state, formAction, pending] = useActionState(
    submitFoundingMember,
    initialState
  );

  if (state?.ok) {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
        <p className="font-serif text-lg text-navy-deep">
          Thank you for requesting founding access.
        </p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          A City2Ranch concierge will follow up as we build routes in your
          area.
        </p>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Full name" required error={fieldErrors?.name} />
        <TextField name="email" type="email" label="Email" required error={fieldErrors?.email} />
        <TextField name="phone" type="tel" label="Phone" required error={fieldErrors?.phone} />
        <TextField name="zip" label="ZIP code" required error={fieldErrors?.zip} />
        <TextField
          name="propertyLocation"
          label="Rural property location"
          hint="Ranch, estate, or nearest town"
          required
          error={fieldErrors?.propertyLocation}
        />
        <TextField
          name="shoppingFrequency"
          label="Typical shopping frequency"
          placeholder="e.g. Weekly"
          required
          error={fieldErrors?.shoppingFrequency}
        />
        <TextField
          name="preferredStores"
          label="Preferred stores"
          error={fieldErrors?.preferredStores}
        />
        <TextField
          name="preferredDays"
          label="Preferred delivery days"
          error={fieldErrors?.preferredDays}
        />
      </div>
      <TextareaField
        name="servicesNeeded"
        label="Services needed"
        hint="Groceries, hardware, pet supplies, errands…"
        error={fieldErrors?.servicesNeeded}
      />
      <Button type="submit" variant="gold" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Request Founding Access"}
      </Button>
    </form>
  );
}
