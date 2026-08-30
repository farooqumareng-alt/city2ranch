"use client";

import { useActionState, useState } from "react";
import { reportProblem } from "@/lib/actions/driver-report-problem";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * Mirrors OrderExceptionForm.tsx's shape (a reason-required form bound
 * to a transition-to-failed action) — this is the driver-facing
 * equivalent, closing the gap where only staff could ever flag a
 * delivery failed. Collapsed behind a "Report a Problem" toggle by
 * default so it reads as a clearly secondary action next to the job's
 * one primary button, not competing with it for attention.
 */
export function ReportProblemForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reportProblem, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans text-xs text-charcoal/60 underline decoration-charcoal/30 hover:text-red-600"
      >
        Report a problem
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="orderId" value={orderId} />
      <TextField name="reason" label="What went wrong?" required className="min-w-[14rem]" />
      <Button type="submit" variant="outline-dark" disabled={pending}>
        {pending ? "Saving…" : "Flag Failed"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
