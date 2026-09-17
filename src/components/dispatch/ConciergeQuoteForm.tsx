"use client";

import { useActionState, useState } from "react";
import { finalizeConciergeQuote, reopenConciergeQuote } from "@/lib/actions/finalize-concierge-quote";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";
import type { EconomicValue, PricingOutcome } from "@/lib/pricing/compute-price";

const initialState: ActionResult | undefined = undefined;

type FeeLineRow = { label: string; amount: string };

const emptyRow = (): FeeLineRow => ({ label: "", amount: "" });

/** Matches ConciergeSuggestion (src/lib/pricing/concierge-suggestion.ts)
 *  minus the fields this form doesn't need to display. */
export type ConciergeQuoteSuggestion = {
  serviceLabel: string;
  baseFeeCents: number;
  mileageFeeCents: number;
  roundTripMiles: number;
  suggestedTotalCents: number;
  hardCost: EconomicValue;
  sustainableFloor: EconomicValue;
  targetProfitPrice: EconomicValue;
  outcome: PricingOutcome;
  belowTargetProfit: boolean | null;
  // Phase 2 — set only when the matched pricing rule is zoned. See the
  // fee-line pre-fill below for why this changes what the customer
  // actually sees on their quote.
  zoneLabel: string | null;
};

function formatEconomicValue(value: EconomicValue): string {
  return value.status === "available" ? `$${(value.cents / 100).toFixed(2)}` : "Not configured";
}

const OUTCOME_COPY: Record<PricingOutcome, { label: string; tone: string }> = {
  STANDARD_PRICE: { label: "Standard price", tone: "text-navy-deep" },
  STAFF_REVIEW: { label: "Needs review", tone: "text-amber-700" },
  NOT_ECONOMICALLY_VIABLE: { label: "Not economically viable", tone: "text-red-600" },
};

/**
 * The Pricing Engine's suggestion, shown read-only above the same
 * editable fee-line list this form already had — nothing about that
 * mechanism changes, this is purely informational context for staff
 * before they decide whether to accept, adjust, or ignore it. Numbers
 * that aren't configured show "Not configured", never a fabricated $0
 * (see compute-price.ts's own doc comment on EconomicValue).
 */
function SuggestionPanel({ suggestion }: { suggestion: ConciergeQuoteSuggestion }) {
  const outcome = OUTCOME_COPY[suggestion.outcome];
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-gold/40 bg-gold/10 p-4">
      <p className="font-sans text-xs uppercase tracking-[0.1em] text-charcoal/50">Pricing Engine Suggestion</p>
      {suggestion.zoneLabel ? (
        <p className="font-sans text-sm text-navy-deep">
          Zone: {suggestion.zoneLabel} ({suggestion.roundTripMiles} mi round trip) = $
          {(suggestion.suggestedTotalCents / 100).toFixed(2)}
        </p>
      ) : (
        <p className="font-sans text-sm text-navy-deep">
          {suggestion.serviceLabel}: ${(suggestion.baseFeeCents / 100).toFixed(2)} base + $
          {(suggestion.mileageFeeCents / 100).toFixed(2)} mileage ({suggestion.roundTripMiles} mi round trip) = $
          {(suggestion.suggestedTotalCents / 100).toFixed(2)}
        </p>
      )}
      <p className="font-sans text-[10px] text-charcoal/50">
        Internal math shown here for staff context only — never exposed to the customer (see the fee line below).
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-sans text-xs text-charcoal/70 sm:grid-cols-4">
        <div>
          <dt className="text-charcoal/50">Hard Cost</dt>
          <dd>{formatEconomicValue(suggestion.hardCost)}</dd>
        </div>
        <div>
          <dt className="text-charcoal/50">Sustainable Floor</dt>
          <dd>{formatEconomicValue(suggestion.sustainableFloor)}</dd>
        </div>
        <div>
          <dt className="text-charcoal/50">Target Profit Price</dt>
          <dd>{formatEconomicValue(suggestion.targetProfitPrice)}</dd>
        </div>
        <div>
          <dt className="text-charcoal/50">Outcome</dt>
          <dd className={outcome.tone}>{outcome.label}</dd>
        </div>
      </dl>
      {suggestion.belowTargetProfit ? (
        <p className="font-sans text-xs text-amber-700">
          Below the target profit price — still sendable, not a block, just a flag.
        </p>
      ) : null}
      <p className="font-sans text-xs text-charcoal/50">
        Pre-filled into the fee lines below — change, remove, or add to them freely before sending.
      </p>
    </div>
  );
}

export function ConciergeQuoteForm({
  orderId,
  status,
  existingFeeLines,
  suggestion,
}: {
  orderId: string;
  status: string;
  existingFeeLines: { label: string; amountCents: number }[];
  /** Only ever set when the order still needs a quote and a Concierge
   *  pricing rule + mileage data both exist — null falls back to
   *  today's plain manual workflow with zero visual change (see
   *  getConciergeSuggestion()'s own doc comment on why null, not a
   *  fabricated suggestion, is the correct answer when configuration
   *  is incomplete). */
  suggestion?: ConciergeQuoteSuggestion | null;
}) {
  const [state, formAction, pending] = useActionState(finalizeConciergeQuote, initialState);
  const [lines, setLines] = useState<FeeLineRow[]>(() => {
    if (existingFeeLines.length > 0) {
      return existingFeeLines.map((l) => ({ label: l.label, amount: (l.amountCents / 100).toFixed(2) }));
    }
    if (suggestion?.zoneLabel) {
      // Zoned rule (Phase 2) — one all-inclusive line, no mileage shown.
      // The customer sees a service fee, never mileage × rate — see
      // schema.ts's doc comment on pricingRules.zoneLabel.
      return [{ label: suggestion.zoneLabel, amount: (suggestion.suggestedTotalCents / 100).toFixed(2) }];
    }
    if (suggestion) {
      return [
        { label: suggestion.serviceLabel, amount: (suggestion.baseFeeCents / 100).toFixed(2) },
        {
          label: `Mileage (${suggestion.roundTripMiles} mi round trip)`,
          amount: (suggestion.mileageFeeCents / 100).toFixed(2),
        },
      ];
    }
    return [emptyRow()];
  });

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const isEditable = status === "quote_pending";
  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalDiffersFromSuggestion =
    suggestion != null && Math.round(total * 100) !== suggestion.suggestedTotalCents;

  function updateLine(index: number, patch: Partial<FeeLineRow>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setLines((rows) => [...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    setLines((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  if (!isEditable) {
    return (
      <div className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
        <h3 className="font-serif text-lg text-navy-deep">Quote</h3>
        <dl className="flex flex-col gap-2 font-sans text-sm">
          {existingFeeLines.map((line, i) => (
            <div key={i} className="flex justify-between">
              <dt className="text-charcoal/70">{line.label}</dt>
              <dd>${(line.amountCents / 100).toFixed(2)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-navy/10 pt-2 font-medium text-navy-deep">
            <dt>Total</dt>
            <dd>${(existingFeeLines.reduce((s, l) => s + l.amountCents, 0) / 100).toFixed(2)}</dd>
          </div>
        </dl>
        {status === "priced" ? (
          <form action={reopenConciergeQuote.bind(null, orderId)}>
            <Button type="submit" variant="outline-dark">
              Reopen Quote
            </Button>
          </form>
        ) : (
          <p className="font-sans text-xs text-charcoal/60">
            Quote can only be edited while the order is awaiting a quote.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-sm border border-navy/10 bg-white/60 p-6">
      <h3 className="font-serif text-lg text-navy-deep">Build Quote</h3>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <input type="hidden" name="orderId" value={orderId} />

      {suggestion ? <SuggestionPanel suggestion={suggestion} /> : null}

      <div className="flex flex-col gap-3">
        {lines.map((row, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <TextField
              name={`fee-label-${index}`}
              label="Fee label"
              placeholder="City2Ranch Service Fee"
              required
              value={row.label}
              onChange={(e) => updateLine(index, { label: e.target.value })}
            />
            <TextField
              name={`fee-amount-${index}`}
              label="Amount ($)"
              placeholder="75.00"
              inputMode="decimal"
              required
              value={row.amount}
              onChange={(e) => updateLine(index, { amount: e.target.value })}
            />
            <Button
              type="button"
              variant="outline-dark"
              onClick={() => removeRow(index)}
              disabled={lines.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline-dark" className="self-start" onClick={addRow}>
        Add Fee Line
      </Button>
      {fieldErrors?.feeLinesJson ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {fieldErrors.feeLinesJson}
        </p>
      ) : null}

      <input type="hidden" name="feeLinesJson" value={JSON.stringify(lines)} />

      {totalDiffersFromSuggestion ? (
        <TextField
          name="overrideReason"
          label="Reason for adjusting the suggested price (optional)"
          hint="Recorded alongside the original and final amounts — helps make sense of pricing decisions later."
          placeholder="e.g. Customer retention, extra stop, special circumstance…"
        />
      ) : null}

      <div className="flex items-center justify-between border-t border-navy/10 pt-4">
        <p className="font-sans text-sm font-medium text-navy-deep">
          Total: ${total.toFixed(2)}
        </p>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "Saving…" : "Finalize & Send Quote"}
        </Button>
      </div>
    </form>
  );
}
