import { describe, expect, it } from "vitest";
import { resolveNotifyDecision } from "./decision";

describe("resolveNotifyDecision", () => {
  it("defaults to sending when there's no preferences row yet", () => {
    expect(resolveNotifyDecision(undefined, "paymentReceipts")).toBe(true);
  });

  it("sends when the row explicitly has the category turned on", () => {
    expect(resolveNotifyDecision({ paymentReceipts: true }, "paymentReceipts")).toBe(true);
  });

  it("suppresses when the row explicitly has the category turned off", () => {
    expect(resolveNotifyDecision({ paymentReceipts: false }, "paymentReceipts")).toBe(false);
  });
});
