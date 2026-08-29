"use client";

import { useActionState } from "react";
import { addStaffMember } from "@/lib/actions/team-management";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState(addStaffMember, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600 sm:basis-full">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="font-sans text-sm text-navy-deep sm:basis-full">Staff member added.</p>
      ) : null}
      <TextField
        name="email"
        type="email"
        label="Email"
        hint="They must have signed in to City2Ranch at least once already."
        required
        defaultValue={values?.email}
        error={fieldErrors?.email}
        className="sm:min-w-[260px]"
      />
      <TextField
        name="label"
        label="Label (optional)"
        placeholder="e.g. Dispatcher"
        defaultValue={values?.label}
        error={fieldErrors?.label}
        className="sm:min-w-[200px]"
      />
      <Button type="submit" variant="navy" disabled={pending}>
        {pending ? "Adding…" : "Add Staff"}
      </Button>
    </form>
  );
}
