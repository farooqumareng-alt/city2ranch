"use client";

import { useActionState } from "react";
import { inviteHouseholdMember } from "@/lib/actions/household";
import { TextField, SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { HOUSEHOLD_ROLE_OPTIONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function InviteHouseholdMemberForm() {
  const [state, formAction, pending] = useActionState(inviteHouseholdMember, initialState);
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
        <p className="font-sans text-sm text-navy-deep sm:basis-full">Invitation sent.</p>
      ) : null}
      <TextField
        name="email"
        type="email"
        label="Invite by email"
        required
        defaultValue={values?.email}
        error={fieldErrors?.email}
        className="sm:min-w-[280px]"
      />
      <SelectField
        name="role"
        label="Access"
        defaultValue="full"
        options={HOUSEHOLD_ROLE_OPTIONS}
        className="sm:min-w-[240px]"
      />
      <Button type="submit" variant="navy" disabled={pending}>
        {pending ? "Sending…" : "Send Invite"}
      </Button>
    </form>
  );
}
