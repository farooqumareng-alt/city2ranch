import { describe, expect, it } from "vitest";
import { sumFeeLines } from "./fee-lines";

describe("sumFeeLines", () => {
  it("sums multiple fee lines", () => {
    const total = sumFeeLines([
      { amountCents: 7500 },
      { amountCents: 2500 },
      { amountCents: 1000 },
    ]);
    expect(total).toBe(11000);
  });

  it("returns 0 for an empty list", () => {
    expect(sumFeeLines([])).toBe(0);
  });

  it("handles a single line", () => {
    expect(sumFeeLines([{ amountCents: 4200 }])).toBe(4200);
  });
});
