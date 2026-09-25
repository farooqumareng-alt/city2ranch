"use client";

import { useActionState } from "react";
import { setInboxEntryStatus } from "@/lib/actions/inbox";
import type { InboxSource } from "@/lib/inbox-types";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
] as const;

/**
 * A segmented pill control, not a native <select> — replaced 2026-09-25
 * after the user flagged the old <select>'s open dropdown list rendering
 * with the browser's own default colors/font (solid blue highlight,
 * system sans-serif) instead of this app's navy/gold/serif system. That
 * mismatch is a real platform limitation, not a CSS bug: a native
 * <select>'s closed box can be styled, but its open option list is
 * rendered by the OS/browser chrome and can't be restyled with CSS in
 * Chromium. Four fixed states is few enough that plain buttons (same
 * active/inactive pill styling WorkQueueBoard.tsx's own tab bar already
 * uses) are a better fit anyway — one click commits the change directly,
 * no separate "Update" step, and every pixel is this app's own CSS.
 */
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
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="submit"
            name="status"
            value={option.value}
            disabled={pending || option.value === currentStatus}
            className={`rounded-full border px-3 py-1 font-sans text-xs transition-colors disabled:cursor-default ${
              option.value === currentStatus
                ? "border-navy-deep bg-navy-deep text-white"
                : "border-navy/15 text-charcoal/70 hover:border-gold disabled:opacity-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
