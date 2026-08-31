"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/** Accept, bound to acceptJob.bind(null, order.id) — same
 *  useActionState-per-button shape as JobActionButton, kept as its own
 *  small component (rather than reusing JobActionButton) since Accept
 *  and Decline need to render side by side as two independent forms,
 *  not one. */
function AcceptButton({
  action,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1">
      <Button type="submit" variant="gold" size="lg" disabled={pending} className="w-full">
        {pending ? "Accepting…" : "Accept"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Decline — an optional one-line reason, kept low-friction (never
 *  required) per the brief's "minimal typing" principle. */
function DeclineButton({
  action,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1">
      <input
        type="text"
        name="reason"
        placeholder="Reason (optional)"
        className="w-full rounded-sm border border-navy/20 bg-white px-3 py-2 font-sans text-xs text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
      />
      <Button type="submit" variant="outline-dark" size="lg" disabled={pending} className="w-full">
        {pending ? "Declining…" : "Decline"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** The very first screen state in a new job's life — a driver has been
 *  offered this job and hasn't responded yet (see pending_acceptance in
 *  src/lib/orders/status.ts). Accept is primary (gold, matches every
 *  other primary driver action); Decline is secondary (outline) —
 *  mutually exclusive alternatives, not a sequence, so both render at
 *  once rather than one primary action gating a second screen. */
export function AcceptDeclineButtons({
  onAccept,
  onDecline,
}: {
  onAccept: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  onDecline: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <AcceptButton action={onAccept} />
      <DeclineButton action={onDecline} />
    </div>
  );
}
