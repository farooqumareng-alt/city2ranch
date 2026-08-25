"use client";

import { useActionState } from "react";
import { confirmDelivery } from "@/lib/actions/driver-confirm-delivery";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function ConfirmDeliveryForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(confirmDelivery, initialState);

  if (state?.ok) {
    return (
      <p className="font-sans text-sm font-medium text-navy-deep">
        Delivered — confirmed.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="orderId" value={orderId} />
      <TextField
        name="pin"
        label="Ask the customer for their delivery PIN"
        required
        inputMode="numeric"
        maxLength={4}
        className="max-w-[10rem]"
      />
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Confirming…" : "Confirm delivery"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
