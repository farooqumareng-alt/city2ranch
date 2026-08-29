import { describe, expect, it } from "vitest";
import { resolveNotifyDecision } from "./decision";

describe("resolveNotifyDecision", () => {
  it("defaults to sending when there's no preferences row yet", () => {
    expect(resolveNotifyDecision(undefined, "paymentReceipts")).toBe(true);
    expect(resolveNotifyDecision(undefined, "recurringOrderCreated")).toBe(true);
  });

  it("sends when the row explicitly has the category turned on", () => {
    expect(
      resolveNotifyDecision({ paymentReceipts: true, recurringOrderCreated: true }, "paymentReceipts")
    ).toBe(true);
    expect(
      resolveNotifyDecision({ paymentReceipts: true, recurringOrderCreated: true }, "recurringOrderCreated")
    ).toBe(true);
  });

  it("suppresses when the row explicitly has the category turned off", () => {
    expect(
      resolveNotifyDecision({ paymentReceipts: false, recurringOrderCreated: true }, "paymentReceipts")
    ).toBe(false);
    expect(
      resolveNotifyDecision({ paymentReceipts: true, recurringOrderCreated: false }, "recurringOrderCreated")
    ).toBe(false);
  });

  it("reads each category from its own column, independent of the others", () => {
    const row = { paymentReceipts: false, recurringOrderCreated: true };
    expect(resolveNotifyDecision(row, "paymentReceipts")).toBe(false);
    expect(resolveNotifyDecision(row, "recurringOrderCreated")).toBe(true);
  });
});
