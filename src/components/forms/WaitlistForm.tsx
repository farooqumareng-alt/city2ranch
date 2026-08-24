"use client";

import { useActionState } from "react";
import { submitWaitlist } from "@/lib/actions/waitlist";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function WaitlistForm({ zip }: { zip?: string }) {
  const [state, formAction, pending] = useActionState(
    submitWaitlist,
    initialState
  );

  if (state?.ok) {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
        <p className="font-serif text-lg text-navy-deep">
          You&apos;re on the list.
        </p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          We&apos;ll reach out as City2Ranch builds a route near you.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="name"
          label="Full name"
          required
          error={state && !state.ok ? state.fieldErrors?.name : undefined}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          required
          error={state && !state.ok ? state.fieldErrors?.email : undefined}
        />
        <TextField
          name="phone"
          type="tel"
          label="Phone"
          required
          error={state && !state.ok ? state.fieldErrors?.phone : undefined}
        />
        <TextField
          name="zip"
          label="ZIP code"
          required
          defaultValue={zip}
          error={state && !state.ok ? state.fieldErrors?.zip : undefined}
        />
        <TextField
          name="city"
          label="City"
          required
          error={state && !state.ok ? state.fieldErrors?.city : undefined}
        />
        <TextField
          name="preferredFrequency"
          label="Preferred frequency"
          placeholder="e.g. Weekly"
          required
          error={
            state && !state.ok ? state.fieldErrors?.preferredFrequency : undefined
          }
        />
      </div>
      <Button type="submit" variant="navy" disabled={pending} className="self-start">
        {pending ? "Submitting…" : "Join the Private Route List"}
      </Button>
    </form>
  );
}
