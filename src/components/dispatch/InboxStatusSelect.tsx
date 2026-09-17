"use client";

import { useActionState } from "react";
import { setInboxEntryStatus } from "@/lib/actions/inbox";
import type { InboxSource } from "@/lib/inbox-types";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
] as const;

/** Same shape as RoleSelect — a real <select> + explicit Save button,
 *  not a single toggle, since there are four real states here, not
 *  two. */
export function InboxStatusSelect({
  source,
  id,
  currentStatus,
}: {
  source: InboxSource;
  id: string;
  currentStatus: "new" | "contacted" | "converted" | "closed";
}) {
  const boundAction = setInboxEntryStatus.bind(null, source, id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="status"
          defaultValue={currentStatus}
          className="rounded-sm border border-navy/20 bg-white px-3 py-2 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline-dark" size="md" disabled={pending}>
          {pending ? "Saving…" : "Update"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
