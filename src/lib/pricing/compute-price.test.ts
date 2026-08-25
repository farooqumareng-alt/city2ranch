import { describe, expect, it } from "vitest";
import { computePrice } from "./compute-price";

describe("computePrice", () => {
  it("computes base + mileage with no floor", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: null },
      25
    );
    expect(result).toEqual({
      baseFeeCents: 1500,
      mileageFeeCents: 3750,
      totalCents: 5250,
    });
  });

  it("rounds a fractional mileage fee to the nearest cent", () => {
    const result = computePrice(
      { baseFeeCents: 1000, perMileCents: 133, minFeeCents: null },
      10.4
    );
    // 133 * 10.4 = 1383.2 -> rounds to 1383
    expect(result.mileageFeeCents).toBe(1383);
    expect(result.totalCents).toBe(2383);
  });

  it("applies the minimum-fee floor when base + mileage falls short", () => {
    const result = computePrice(
      { baseFeeCents: 500, perMileCents: 50, minFeeCents: 2500 },
      2
    );
    // base 500 + mileage 100 = 600, below the 2500 floor
    expect(result.baseFeeCents).toBe(500);
    expect(result.mileageFeeCents).toBe(100);
    expect(result.totalCents).toBe(2500);
  });

  it("does not apply the floor when it's already exceeded", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: 2500 },
      25
    );
    expect(result.totalCents).toBe(5250);
  });

  it("treats zero miles as base fee only", () => {
    const result = computePrice(
      { baseFeeCents: 1500, perMileCents: 150, minFeeCents: null },
      0
    );
    expect(result).toEqual({
      baseFeeCents: 1500,
      mileageFeeCents: 0,
      totalCents: 1500,
    });
  });
});
