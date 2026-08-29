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
 * Shared enable/disable button for both a staff row (setStaffActive)
 * and a driver row (setDriverActive) — same reasoning as
 * RoleToggleButton: this can meaningfully fail (the last-super-admin
 * rail, for a staff row), so it needs useActionState to actually show
 * that failure, not a bare bound-form button.
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
