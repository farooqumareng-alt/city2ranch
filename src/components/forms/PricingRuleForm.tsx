"use client";

import { useActionState } from "react";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type PricingRuleDefaults = {
  serviceLabel: string | null;
  baseFeeCents: number;
  perMileCents: number;
  minFeeCents: number | null;
  note: string | null;
};

/** Cents -> a plain dollar string for a text input's defaultValue — the
 *  inverse of the dollars-to-cents transform in pricingRuleSchema. Only
 *  used for a row already in the database; a failed-submit's `values`
 *  are already the raw dollar string the user typed (see
 *  valuesFromFormData), never re-converted. */
function centsToDollarString(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

/** Shared create/edit form for the admin Pricing screen. Deliberately
 *  has no isActive control at all — see activatePricingRule in
 *  pricing-management.ts for why that's a separate, dedicated action
 *  rather than a field on this form. */
export function PricingRuleForm({
  action,
  rule,
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  rule?: PricingRuleDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <TextField
        name="serviceLabel"
        label="Customer-facing service name"
        placeholder="e.g. Rural Route Service"
        hint="Shown to customers as what they're being charged for — never the fee breakdown itself."
        defaultValue={values?.serviceLabel ?? rule?.serviceLabel ?? ""}
        error={fieldErrors?.serviceLabel}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="baseFeeCents"
          label="Base fee ($)"
          placeholder="15.00"
          required
          defaultValue={values?.baseFeeCents ?? centsToDollarString(rule?.baseFeeCents)}
          error={fieldErrors?.baseFeeCents}
        />
        <TextField
          name="perMileCents"
          label="Per-mile fee ($)"
          placeholder="1.50"
          required
          defaultValue={values?.perMileCents ?? centsToDollarString(rule?.perMileCents)}
          error={fieldErrors?.perMileCents}
        />
        <TextField
          name="minFeeCents"
          label="Minimum fee ($)"
          placeholder="25.00"
          hint="Leave blank for no minimum."
          defaultValue={values?.minFeeCents ?? centsToDollarString(rule?.minFeeCents)}
          error={fieldErrors?.minFeeCents}
        />
      </div>

      <TextareaField
        name="note"
        label="Internal note"
        hint="Staff-only — never shown to customers."
        defaultValue={values?.note ?? rule?.note ?? ""}
        error={fieldErrors?.note}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
