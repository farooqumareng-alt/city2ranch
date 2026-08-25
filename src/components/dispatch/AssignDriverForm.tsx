"use client";

import { useActionState } from "react";
import { assignDriver } from "@/lib/actions/assign-driver";
import { SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function AssignDriverForm({
  orderId,
  driverOptions,
}: {
  orderId: string;
  driverOptions: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignDriver, initialState);

  if (driverOptions.length === 0) {
    return (
      <p className="font-sans text-xs text-charcoal/60">
        No active drivers available to assign.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="orderId" value={orderId} />
      <SelectField
        name="driverId"
        label="Assign driver"
        options={driverOptions}
        className="min-w-[12rem]"
      />
      <Button type="submit" variant="navy" disabled={pending}>
        {pending ? "Assigning…" : "Assign"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
