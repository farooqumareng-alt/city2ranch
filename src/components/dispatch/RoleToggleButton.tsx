"use client";

import { useActionState } from "react";
import { setStaffRole } from "@/lib/actions/team-management";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * One promote/demote button per staff row. Deliberately its own small
 * client component (not a bare `<form action={fn.bind(...)}>` like
 * revokeHouseholdMember's pattern elsewhere) because this action can
 * meaningfully fail — the last-super-admin safety rail — and a bare
 * form silently drops a server action's return value; useActionState
 * is what actually surfaces it.
 */
export function RoleToggleButton({
  staffId,
  currentRole,
}: {
  staffId: string;
  currentRole: "staff" | "super_admin";
}) {
  const boundAction = setStaffRole.bind(null, staffId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const targetRole = currentRole === "super_admin" ? "staff" : "super_admin";

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="role" value={targetRole} />
      <Button type="submit" variant="outline-dark" size="md" disabled={pending}>
        {currentRole === "super_admin" ? "Demote to Staff" : "Promote to Super Admin"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
