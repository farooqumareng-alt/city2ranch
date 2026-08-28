"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/lib/actions/notification-preferences";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function NotificationPreferencesForm({ paymentReceipts }: { paymentReceipts: boolean }) {
  const [state, formAction, pending] = useActionState(updateNotificationPreferences, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="font-sans text-sm text-navy-deep">Preferences saved.</p>
      ) : null}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="paymentReceipts"
          defaultChecked={paymentReceipts}
          className="mt-1 h-4 w-4 rounded-sm border-navy/30 text-gold focus-visible:outline-2 focus-visible:outline-gold"
        />
        <span>
          <span className="block font-sans text-sm font-medium text-navy-deep">Payment receipts</span>
          <span className="block font-sans text-xs text-charcoal/60">
            Email me a receipt and delivery PIN when a payment succeeds.
          </span>
        </span>
      </label>

      <Button type="submit" variant="navy" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Preferences"}
      </Button>
    </form>
  );
}
