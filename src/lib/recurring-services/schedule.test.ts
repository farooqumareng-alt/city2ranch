import { describe, expect, it } from "vitest";
import { advanceNextRunAt } from "./schedule";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("advanceNextRunAt", () => {
  it("adds exactly 7 days for weekly", () => {
    const result = advanceNextRunAt(new Date("2026-01-05T12:00:00Z"), "weekly");
    expect(iso(result)).toBe("2026-01-12");
  });

  it("adds exactly 14 days for biweekly", () => {
    const result = advanceNextRunAt(new Date("2026-01-05T12:00:00Z"), "biweekly");
    expect(iso(result)).toBe("2026-01-19");
  });

  it("adds a plain calendar month when the day exists in both months", () => {
    const result = advanceNextRunAt(new Date("2026-01-15T12:00:00Z"), "monthly");
    expect(iso(result)).toBe("2026-02-15");
  });

  it("clamps Jan 31 to Feb 28 in a non-leap year, instead of overflowing to Mar 3", () => {
    const result = advanceNextRunAt(new Date("2026-01-31T12:00:00Z"), "monthly");
    expect(iso(result)).toBe("2026-02-28");
  });

  it("clamps Jan 31 to Feb 29 in a leap year", () => {
    const result = advanceNextRunAt(new Date("2028-01-31T12:00:00Z"), "monthly");
    expect(iso(result)).toBe("2028-02-29");
  });

  it("rolls the year over for a December monthly plan", () => {
    const result = advanceNextRunAt(new Date("2026-12-31T12:00:00Z"), "monthly");
    expect(iso(result)).toBe("2027-01-31");
  });

  it("preserves the time of day, not just the date", () => {
    const result = advanceNextRunAt(new Date("2026-01-05T09:30:00Z"), "weekly");
    expect(result.toISOString()).toBe("2026-01-12T09:30:00.000Z");
  });
});
