"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type JobAction = (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;

/**
 * The single primary action on a driver's job card (Mark Picked Up /
 * Mark On The Way) — mirrors ActiveToggleButton.tsx's shape. Needed
 * because markPickedUp/markInTransit used to return void and were bound
 * to a bare <form>, so a failure (order not found, illegal transition)
 * was silently invisible to the driver; useActionState is what actually
 * surfaces it.
 */
export function JobActionButton({
  action,
  label,
  pendingLabel,
}: {
  /** Already bound to the order's id, e.g. markPickedUp.bind(null, order.id). */
  action: JobAction;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <Button type="submit" variant="navy" size="lg" disabled={pending} className="w-full">
        {pending ? pendingLabel : label}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
