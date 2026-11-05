import { describe, expect, it } from "vitest";
import {
  QUOTE_VALIDITY_HOURS,
  STALE_PAYMENT_PENDING_HOURS,
  quoteExpiryFrom,
  isQuoteExpired,
  isStalePaymentPending,
  refundableBalanceCents,
  refundedTotalCents,
} from "./money";

const HOUR = 60 * 60 * 1000;

describe("quote expiry (Build 3 — PRC-07)", () => {
  it("expires exactly QUOTE_VALIDITY_HOURS after finalizing", () => {
    const finalizedAt = new Date("2026-11-04T12:00:00Z");
    const expiresAt = quoteExpiryFrom(finalizedAt);
    expect(expiresAt.getTime() - finalizedAt.getTime()).toBe(QUOTE_VALIDITY_HOURS * HOUR);
    expect(QUOTE_VALIDITY_HOURS).toBe(72);
  });

  it("is not expired at the boundary, and is expired after it", () => {
    const expiresAt = new Date("2026-11-07T12:00:00Z");
    expect(isQuoteExpired(expiresAt, new Date(expiresAt.getTime()))).toBe(false);
    expect(isQuoteExpired(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(true);
    expect(isQuoteExpired(expiresAt, new Date(expiresAt.getTime() - HOUR))).toBe(false);
  });

  it("never expires a legacy quote (null expiry)", () => {
    expect(isQuoteExpired(null, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("stale payment detection (Build 3 — QA-012)", () => {
  const now = new Date("2026-11-04T12:00:00Z");

  it("flags payment_pending older than the stale window", () => {
    const updatedAt = new Date(now.getTime() - (STALE_PAYMENT_PENDING_HOURS + 1) * HOUR);
    expect(isStalePaymentPending("payment_pending", updatedAt, now)).toBe(true);
  });

  it("does not flag a fresh payment_pending (a live checkout may sit there legitimately)", () => {
    const updatedAt = new Date(now.getTime() - 2 * HOUR);
    expect(isStalePaymentPending("payment_pending", updatedAt, now)).toBe(false);
  });

  it("never flags other statuses, however old", () => {
    const updatedAt = new Date(now.getTime() - 30 * 24 * HOUR);
    expect(isStalePaymentPending("priced", updatedAt, now)).toBe(false);
    expect(isStalePaymentPending("paid", updatedAt, now)).toBe(false);
  });
});

describe("refund balances (Build 3 — PRC-06)", () => {
  it("starts at the full captured total", () => {
    expect(refundableBalanceCents(10000, [])).toBe(10000);
    expect(refundedTotalCents([])).toBe(0);
  });

  it("subtracts succeeded refunds from the balance and counts them as refunded", () => {
    const refunds = [{ amountCents: 2500, status: "succeeded" }];
    expect(refundableBalanceCents(10000, refunds)).toBe(7500);
    expect(refundedTotalCents(refunds)).toBe(2500);
  });

  it("reserves pending refunds against the balance without counting them as refunded", () => {
    // A pending row means Stripe may still take this money — a second
    // refund must not be able to spend the same dollars.
    const refunds = [
      { amountCents: 2500, status: "succeeded" },
      { amountCents: 4000, status: "pending" },
    ];
    expect(refundableBalanceCents(10000, refunds)).toBe(3500);
    expect(refundedTotalCents(refunds)).toBe(2500);
  });

  it("ignores failed refunds entirely (no money moved)", () => {
    const refunds = [{ amountCents: 9000, status: "failed" }];
    expect(refundableBalanceCents(10000, refunds)).toBe(10000);
    expect(refundedTotalCents(refunds)).toBe(0);
  });

  it("never goes negative, even against inconsistent data", () => {
    const refunds = [{ amountCents: 15000, status: "succeeded" }];
    expect(refundableBalanceCents(10000, refunds)).toBe(0);
  });
});
