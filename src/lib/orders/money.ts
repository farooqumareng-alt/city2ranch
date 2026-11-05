/**
 * Pure money-lifecycle helpers for orders (Build 3, 2026-11-04) —
 * quote validity, stale-payment detection, and refund balances.
 * DB-free and clock-free (callers pass `now`) so every rule here is
 * directly unit-tested; the actions that use them stay thin.
 */

/** How long a finalized quote stays payable. 72 hours is the
 *  business default (Build 0 decision 0.4's staged value): long
 *  enough for a ranch customer to get back to a screen, short enough
 *  that a stale price doesn't linger into a different cost reality. */
export const QUOTE_VALIDITY_HOURS = 72;

export function quoteExpiryFrom(finalizedAt: Date): Date {
  return new Date(finalizedAt.getTime() + QUOTE_VALIDITY_HOURS * 60 * 60 * 1000);
}

/** A null expiry never expires — orders priced before quote_expires_at
 *  existed keep the terms they were quoted under; expiry only binds
 *  quotes issued after Build 3. */
export function isQuoteExpired(quoteExpiresAt: Date | null, now: Date): boolean {
  return quoteExpiresAt != null && now.getTime() > quoteExpiresAt.getTime();
}

/** A payment_pending order older than this is stuck, not in flight:
 *  Stripe Checkout sessions live at most 24 hours, and the expired
 *  webhook reverts the order when a session lapses — so a full day in
 *  payment_pending means that revert never landed (the audit's $1.99
 *  order sat there for weeks). */
export const STALE_PAYMENT_PENDING_HOURS = 24;

export function isStalePaymentPending(status: string, updatedAt: Date, now: Date): boolean {
  if (status !== "payment_pending") return false;
  return now.getTime() - updatedAt.getTime() > STALE_PAYMENT_PENDING_HOURS * 60 * 60 * 1000;
}

export type RefundLike = {
  amountCents: number;
  status: string; // pending | succeeded | failed
};

/**
 * How much of an order's captured total can still be refunded.
 * Succeeded refunds are gone; PENDING refunds reserve their amount
 * too — a pending row means a Stripe call is in flight (or died
 * mid-flight), and letting a second refund spend the same dollars
 * would double-refund. Failed refunds reserve nothing (no money
 * moved). Never negative.
 */
export function refundableBalanceCents(totalCents: number, refunds: RefundLike[]): number {
  const reserved = refunds
    .filter((r) => r.status === "succeeded" || r.status === "pending")
    .reduce((sum, r) => sum + r.amountCents, 0);
  return Math.max(0, totalCents - reserved);
}

/** How much has actually been returned to the customer so far. */
export function refundedTotalCents(refunds: RefundLike[]): number {
  return refunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + r.amountCents, 0);
}
