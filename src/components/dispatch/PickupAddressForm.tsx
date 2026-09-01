"use client";

import { useActionState } from "react";
import { updatePickupAddress } from "@/lib/actions/update-pickup-address";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * Dispatcher-facing counterpart to a brand-only store (see the comment
 * on stores.addressLine1 in schema.ts) — always editable, unlike
 * ConciergeQuoteForm's lock-after-priced behavior, since a pickup
 * address can legitimately need correcting any time before a driver
 * actually arrives (wrong suite number, store relocated, etc.).
 */
export function PickupAddressForm({
  orderId,
  current,
}: {
  orderId: string;
  current: {
    pickupAddressLine1: string | null;
    pickupAddressLine2: string | null;
    pickupCity: string | null;
    pickupState: string | null;
    pickupZip: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updatePickupAddress.bind(null, orderId), initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6">
      <h3 className="font-serif text-lg text-navy-deep">Pickup Address</h3>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          name="pickupAddressLine1"
          label="Address"
          required
          className="sm:col-span-2"
          defaultValue={current.pickupAddressLine1 ?? ""}
          error={fieldErrors?.pickupAddressLine1}
        />
        <TextField
          name="pickupAddressLine2"
          label="Address line 2"
          className="sm:col-span-2"
          defaultValue={current.pickupAddressLine2 ?? ""}
          error={fieldErrors?.pickupAddressLine2}
        />
        <TextField
          name="pickupCity"
          label="City"
          required
          defaultValue={current.pickupCity ?? ""}
          error={fieldErrors?.pickupCity}
        />
        <TextField
          name="pickupState"
          label="State"
          required
          defaultValue={current.pickupState ?? ""}
          error={fieldErrors?.pickupState}
        />
        <TextField
          name="pickupZip"
          label="ZIP code"
          defaultValue={current.pickupZip ?? ""}
          error={fieldErrors?.pickupZip}
        />
      </div>
      <Button type="submit" variant="outline-dark" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Pickup Address"}
      </Button>
    </form>
  );
}
