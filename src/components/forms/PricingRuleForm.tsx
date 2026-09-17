"use client";

import { useActionState } from "react";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

const SERVICE_TYPE_LABELS: Record<string, string> = {
  pickup: "City Pickup",
  concierge: "Concierge",
};

export type PricingRuleDefaults = {
  serviceType: "pickup" | "concierge";
  serviceLabel: string | null;
  baseFeeCents: number;
  perMileCents: number;
  minFeeCents: number | null;
  note: string | null;
  contractorFlatCostCents: number | null;
  contractorPerMileCostCents: number | null;
  sustainableCostAllowanceCents: number | null;
  targetMarginPercent: number | null;
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

/**
 * Shared create/edit form for the admin Pricing screen. Deliberately
 * has no isActive control at all — see activatePricingRule in
 * pricing-management.ts for why that's a separate, dedicated action
 * rather than a field on this form.
 *
 * serviceType is a real <select> only when creating (`rule` is
 * undefined) — editing shows it as a plain read-only label instead,
 * since pricingRuleUpdateSchema doesn't accept it: a rule's service
 * type is part of its identity, not an editable attribute (same
 * discipline as zip_mileage.zip).
 *
 * The four cost fields (Pricing Engine Phase 1, 2026-09-15) are grouped
 * in their own fieldset, visually and conceptually separate from the
 * customer-facing fee fields above them — one is what the customer
 * pays, the other is what it costs City2Ranch to fulfill. Every one is
 * optional; leaving a field blank means "not configured," and the hint
 * text says so explicitly rather than implying blank means zero.
 */
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
    <form action={formAction} className="flex flex-col gap-8">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      {rule ? (
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.1em] text-charcoal/50">Service</p>
          <p className="font-sans text-sm text-navy-deep">{SERVICE_TYPE_LABELS[rule.serviceType]}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="serviceType" className="font-sans text-sm font-medium text-navy-deep">
            Service <span className="text-gold">*</span>
          </label>
          <select
            id="serviceType"
            name="serviceType"
            required
            defaultValue={values?.serviceType ?? ""}
            className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
          >
            <option value="" disabled>
              Choose a service…
            </option>
            <option value="pickup">City Pickup</option>
            <option value="concierge">Concierge</option>
          </select>
          {fieldErrors?.serviceType ? (
            <p role="alert" className="font-sans text-xs text-red-600">
              {fieldErrors.serviceType}
            </p>
          ) : null}
        </div>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Customer Price</legend>
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
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-ivory/60 p-5">
        <legend className="font-serif text-lg text-navy-deep">Real Cost (Pricing Engine)</legend>
        <p className="font-sans text-xs text-charcoal/60">
          What it actually costs City2Ranch to fulfill — separate from what the customer pays above. Leave any
          field blank until you have a real number; blank always means &quot;not configured,&quot; never $0.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="contractorFlatCostCents"
            label="Contractor flat cost ($)"
            placeholder="Not configured"
            defaultValue={values?.contractorFlatCostCents ?? centsToDollarString(rule?.contractorFlatCostCents)}
            error={fieldErrors?.contractorFlatCostCents}
          />
          <TextField
            name="contractorPerMileCostCents"
            label="Contractor per-mile cost ($)"
            placeholder="Not configured"
            defaultValue={
              values?.contractorPerMileCostCents ?? centsToDollarString(rule?.contractorPerMileCostCents)
            }
            error={fieldErrors?.contractorPerMileCostCents}
          />
          <TextField
            name="sustainableCostAllowanceCents"
            label="Sustainable cost allowance ($)"
            placeholder="Not configured"
            hint="Added on top of the flat + per-mile cost above to get the sustainable operating floor."
            defaultValue={
              values?.sustainableCostAllowanceCents ?? centsToDollarString(rule?.sustainableCostAllowanceCents)
            }
            error={fieldErrors?.sustainableCostAllowanceCents}
          />
          <TextField
            name="targetMarginPercent"
            label="Target margin (%)"
            placeholder="Not configured"
            hint="A true margin, not a markup — e.g. 40 means the target price recovers 40% profit after cost."
            defaultValue={values?.targetMarginPercent ?? rule?.targetMarginPercent ?? ""}
            error={fieldErrors?.targetMarginPercent}
          />
        </div>
      </fieldset>

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
