"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * Staff refund control on the Service Record (Build 3 — PRC-06).
 * Amount is optional: blank means "the full refundable balance",
 * which the server recomputes at submit time regardless of what this
 * form shows — the balance printed here is a hint, never the
 * authority (issueOrderRefund re-derives and caps it).
 */
export function RefundForm({
  orderId,
  action,
  balanceCents,
}: {
  orderId: string;
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  balanceCents: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          name="amountDollars"
          label="Refund amount ($)"
          placeholder={(balanceCents / 100).toFixed(2)}
          hint="Blank = full refundable balance."
          className="min-w-[10rem]"
        />
        <TextField name="reason" label="Refund reason" required className="min-w-[14rem]" />
        <Button type="submit" variant="outline-dark" disabled={pending}>
          {pending ? "Refunding…" : "Issue refund"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <p className="font-sans text-xs text-emerald-700">Refund issued.</p> : null}
    </form>
  );
}
