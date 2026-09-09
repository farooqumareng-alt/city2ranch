"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";
import type { DriverDocumentKind } from "@/lib/validation/schemas";

const initialState: ActionResult | undefined = undefined;

const LABELS: Record<DriverDocumentKind, string> = {
  license: "Driver's license",
  insurance: "Insurance card",
  registration: "Vehicle registration",
};

/**
 * One row of the Driver Profile page's document section — a file input
 * plus an Upload button for a single document kind, bound to
 * uploadDriverDocument.bind(null, driverId, kind). "View current file"
 * only appears once a path is on record; it points at the API route
 * that resolves a private-bucket signed URL (the bucket has no public
 * URL to link to directly — see that route's own comment).
 */
export function DriverDocumentUpload({
  driverId,
  kind,
  hasFile,
  action,
}: {
  driverId: string;
  kind: DriverDocumentKind;
  hasFile: boolean;
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-2 border-b border-navy/10 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <p className="font-sans text-sm font-medium text-navy-deep">{LABELS[kind]}</p>
        {hasFile ? (
          <a
            href={`/api/internal/driver-documents/${driverId}/${kind}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs text-charcoal/60 underline hover:text-gold"
          >
            View current file
          </a>
        ) : (
          <span className="font-sans text-xs text-charcoal/40">None on file</span>
        )}
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="font-sans text-sm text-charcoal/75 file:mr-3 file:rounded-sm file:border-0 file:bg-navy/10 file:px-3 file:py-1.5 file:font-sans file:text-sm file:text-navy-deep hover:file:bg-navy/20"
        />
        <Button type="submit" variant="outline-dark" disabled={pending}>
          {pending ? "Uploading…" : hasFile ? "Replace" : "Upload"}
        </Button>
      </form>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <p className="font-sans text-xs text-navy-deep">Uploaded.</p> : null}
    </div>
  );
}
