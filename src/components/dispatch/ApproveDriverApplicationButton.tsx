"use client";

import { useActionState } from "react";
import { approveDriverApplication } from "@/lib/actions/team-management";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * One-click approve for a driver application Inbox entry — reuses
 * createDriverAccount() (team-management.ts) via approveDriverApplication,
 * the exact same account-creation logic the Team page's Add Driver form
 * uses, pre-filled from the application instead of retyped. Same shape
 * as AssignJobForm.tsx: a bound server action, no fields of its own.
 */
export function ApproveDriverApplicationButton({ applicationId }: { applicationId: string }) {
  const boundAction = approveDriverApplication.bind(null, applicationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <Button type="submit" variant="navy" size="md" disabled={pending}>
        {pending ? "Approving…" : "Approve → Create Driver Account"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
