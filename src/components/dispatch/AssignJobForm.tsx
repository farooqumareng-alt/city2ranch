"use client";

import { useActionState } from "react";
import { assignDriver } from "@/lib/actions/assign-driver";
import { SelectField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * The reverse of AssignDriverForm.tsx — starts from a fixed driver
 * (Drivers table's own "Assign Job" action) and picks the order,
 * instead of starting from a fixed order and picking the driver
 * (Orders table). Same underlying `assignDriver` action either way —
 * it only ever cares about an (orderId, driverId) pair, not which side
 * of the pair the caller started from.
 */
export function AssignJobForm({
  driverId,
  orderOptions,
}: {
  driverId: string;
  orderOptions: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignDriver, initialState);

  if (orderOptions.length === 0) {
    return <p className="font-sans text-xs text-charcoal/60">No orders ready to dispatch.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="driverId" value={driverId} />
      <SelectField
        name="orderId"
        label="Assign job"
        options={orderOptions}
        className="min-w-[14rem]"
      />
      <Button type="submit" variant="navy" size="md" disabled={pending}>
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
