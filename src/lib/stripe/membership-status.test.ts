import { describe, expect, it } from "vitest";
import { toMembershipStatus } from "./membership-status";
import type Stripe from "stripe";

describe("toMembershipStatus", () => {
  it("treats active and trialing as active", () => {
    expect(toMembershipStatus("active")).toBe("active");
    expect(toMembershipStatus("trialing")).toBe("active");
  });

  it("treats past_due, unpaid, and incomplete as past_due", () => {
    expect(toMembershipStatus("past_due")).toBe("past_due");
    expect(toMembershipStatus("unpaid")).toBe("past_due");
    expect(toMembershipStatus("incomplete")).toBe("past_due");
  });

  it("treats canceled and incomplete_expired as canceled", () => {
    expect(toMembershipStatus("canceled")).toBe("canceled");
    expect(toMembershipStatus("incomplete_expired")).toBe("canceled");
  });

  it("fails closed (canceled) for an unrecognized future status, never active", () => {
    expect(toMembershipStatus("some_future_status" as Stripe.Subscription.Status)).toBe("canceled");
  });
});
