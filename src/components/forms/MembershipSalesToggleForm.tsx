"use client";

import { useActionState } from "react";
import { setMembershipSalesEnabled } from "@/lib/actions/membership-settings";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function MembershipSalesToggleForm({ salesEnabled }: { salesEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(setMembershipSalesEnabled, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <p className="font-sans text-sm text-navy-deep">Saved.</p> : null}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="salesEnabled"
          defaultChecked={salesEnabled}
          className="mt-1 h-4 w-4 rounded-sm border-navy/30 text-gold focus-visible:outline-2 focus-visible:outline-gold"
        />
        <span>
          <span className="block font-sans text-sm font-medium text-navy-deep">Membership Sales</span>
          <span className="block font-sans text-xs text-charcoal/60">
            When on, customers can subscribe to a paid Membership tier from /membership. When off (the
            default), that page stays the existing request-a-tier lead form.
          </span>
        </span>
      </label>

      <Button type="submit" variant="navy" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
