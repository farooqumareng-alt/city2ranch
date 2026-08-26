import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  IllegalOrderTransitionError,
  ORDER_STATUSES,
} from "./status";

describe("canTransition", () => {
  it("allows every step of the happy path in order", () => {
    const happyPath = [
      "priced",
      "payment_pending",
      "paid",
      "driver_assigned",
      "picked_up",
      "in_transit",
      "completed",
    ] as const;
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it("treats a same-status transition as a safe no-op (idempotent retries)", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it("allows a checkout expiry to revert payment_pending back to priced", () => {
    expect(canTransition("payment_pending", "priced")).toBe(true);
  });

  it("rejects skipping ahead in the lifecycle", () => {
    expect(canTransition("priced", "completed")).toBe(false);
    expect(canTransition("priced", "paid")).toBe(false);
    expect(canTransition("paid", "in_transit")).toBe(false);
  });

  it("rejects moving backward past a completed step", () => {
    expect(canTransition("paid", "payment_pending")).toBe(false);
    expect(canTransition("driver_assigned", "paid")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransition("completed", "in_transit")).toBe(false);
    expect(canTransition("cancelled", "priced")).toBe(false);
    expect(canTransition("failed", "driver_assigned")).toBe(false);
  });

  it("rejects cancelling once the order is physically in the driver's hands", () => {
    expect(canTransition("picked_up", "cancelled")).toBe(false);
    expect(canTransition("in_transit", "cancelled")).toBe(false);
  });

  it("allows failure from any post-payment operational state", () => {
    expect(canTransition("driver_assigned", "failed")).toBe(true);
    expect(canTransition("picked_up", "failed")).toBe(true);
    expect(canTransition("in_transit", "failed")).toBe(true);
  });

  it("allows a concierge quote to finalize into priced", () => {
    expect(canTransition("quote_pending", "priced")).toBe(true);
  });

  it("allows staff to reopen a priced concierge quote to fix a mistake", () => {
    expect(canTransition("priced", "quote_pending")).toBe(true);
  });

  it("rejects a concierge order skipping straight from quote_pending to paid", () => {
    expect(canTransition("quote_pending", "paid")).toBe(false);
  });

  it("allows cancelling a quote still being built", () => {
    expect(canTransition("quote_pending", "cancelled")).toBe(true);
  });
});

describe("assertTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() => assertTransition("priced", "payment_pending")).not.toThrow();
  });

  it("throws IllegalOrderTransitionError for an illegal transition", () => {
    expect(() => assertTransition("priced", "completed")).toThrow(
      IllegalOrderTransitionError
    );
  });
});
