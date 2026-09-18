"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ToggleAction = (
  prevState: ActionResult | undefined,
  formData: FormData
) => Promise<ActionResult>;

/**
 * Enable/disable button for a driver row (setDriverActive). Used to
 * also serve a staff row (setStaffActive) before the Team page's Staff
 * section moved Role+Status onto one combined Edit page (2026-09-18,
 * panel redesign, see updateStaffAccount() in team-management.ts) — the
 * useActionState wrapping still matters here since setDriverActive can
 * fail, so a bare bound-form button would silently drop that failure.
 */
export function ActiveToggleButton({
  action,
  isActive,
}: {
  /** Already bound to the row's id, e.g. setStaffActive.bind(null, staffId). */
  action: ToggleAction;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button type="submit" variant="outline-dark" size="md" disabled={pending}>
        {isActive ? "Disable" : "Enable"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
