"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * The manual escape hatch for a stuck payment_pending order
 * (Build 3 — QA-012), shown on the Service Record only when the
 * order is actually stale. The server action re-checks staleness
 * itself; this button is just the trigger.
 */
export function CloseStalePaymentButton({
  orderId,
  action,
}: {
  orderId: string;
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="outline-dark" size="md" disabled={pending} className="self-start">
        {pending ? "Closing…" : "Close stale payment & return to Priced"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="font-sans text-xs text-emerald-700">Stale payment closed — the order is Priced again.</p>
      ) : null}
    </form>
  );
}
