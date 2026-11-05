"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * The one-click "launch the whole zone set" control on the Pricing
 * list (Build 2, 2026-11-04 — QA-006). The bound action is passed in
 * from the server page, same pattern as PricingRuleForm; the action
 * itself (activatePricingZoneSet) re-checks the whole set's readiness
 * server-side and refuses atomically if any zone is incomplete, so
 * this button can never half-activate a set even if the page's
 * summary was stale when it rendered.
 */
export function ActivateZoneSetButton({
  action,
  label,
}: {
  action: (prev: ActionResult | undefined) => Promise<ActionResult>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="gold" size="md" disabled={pending} className="self-start">
        {pending ? "Activating…" : label}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <p className="font-sans text-xs text-emerald-700">Zone set activated.</p> : null}
    </form>
  );
}
