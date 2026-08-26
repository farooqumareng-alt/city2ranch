"use client";

import { useActionState, useState } from "react";
import { finalizeConciergeQuote, reopenConciergeQuote } from "@/lib/actions/finalize-concierge-quote";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type FeeLineRow = { label: string; amount: string };

const emptyRow = (): FeeLineRow => ({ label: "", amount: "" });

export function ConciergeQuoteForm({
  orderId,
  status,
  existingFeeLines,
}: {
  orderId: string;
  status: string;
  existingFeeLines: { label: string; amountCents: number }[];
}) {
  const [state, formAction, pending] = useActionState(finalizeConciergeQuote, initialState);
  const [lines, setLines] = useState<FeeLineRow[]>(
    existingFeeLines.length > 0
      ? existingFeeLines.map((l) => ({ label: l.label, amount: (l.amountCents / 100).toFixed(2) }))
      : [emptyRow()]
  );

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const isEditable = status === "quote_pending";
  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

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
