"use client";

import { useActionState } from "react";
import { addDriver } from "@/lib/actions/team-management";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function AddDriverForm() {
  const [state, formAction, pending] = useActionState(addDriver, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600 sm:basis-full">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="font-sans text-sm text-navy-deep sm:basis-full">Driver added.</p>
      ) : null}
      <TextField
        name="email"
        type="email"
        label="Email"
        hint="They must have signed in to City2Ranch at least once already."
        required
        defaultValue={values?.email}
        error={fieldErrors?.email}
        className="sm:min-w-[240px]"
      />
      <TextField
        name="name"
        label="Full name"
        required
        defaultValue={values?.name}
        error={fieldErrors?.name}
        className="sm:min-w-[200px]"
      />
      <TextField
        name="phone"
        type="tel"
        label="Phone"
        required
        defaultValue={values?.phone}
        error={fieldErrors?.phone}
        className="sm:min-w-[180px]"
      />
      <Button type="submit" variant="navy" disabled={pending}>
        {pending ? "Adding…" : "Add Driver"}
      </Button>
    </form>
  );
}
