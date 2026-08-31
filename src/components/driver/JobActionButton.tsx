"use client";

import { useActionState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type JobAction = (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;

/**
 * A single primary form action that disables itself while pending —
 * originally built for a driver's job card (Mark Picked Up / Mark On
 * The Way), reused for any single-button ActionResult-returning form
 * that needs the same double-submit guard (e.g. Approve & Pay, where a
 * double-click used to be able to create two live Stripe Checkout
 * Sessions for one order). `variant`/`size` default to the original
 * driver look so existing call sites are unaffected.
 */
export function JobActionButton({
  action,
  label,
  pendingLabel,
  variant = "navy",
  size = "lg",
}: {
  /** Already bound to the order's id, e.g. markPickedUp.bind(null, order.id). */
  action: JobAction;
  label: string;
  pendingLabel: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <Button type="submit" variant={variant} size={size} disabled={pending} className="w-full">
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
