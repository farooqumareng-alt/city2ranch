"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * Shared UI for the cancel/fail exception forms on the dispatch queue —
 * bound to `cancelOrder` or `failOrder` (src/lib/actions/staff-order-exceptions.ts)
 * by the caller. Both require a reason, which lands in the audit event.
 */
export function OrderExceptionForm({
  orderId,
  action,
  label,
}: {
  orderId: string;
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="orderId" value={orderId} />
      <TextField
        name="reason"
        label={`${label} reason`}
        required
        className="min-w-[14rem]"
      />
      <Button type="submit" variant="outline-dark" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
