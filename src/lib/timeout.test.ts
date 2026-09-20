import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "./timeout";

describe("withTimeout", () => {
  it("resolves with the promise's own value when it settles before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("real value"), 1000, "fallback");
    expect(result).toBe("real value");
  });

  it("resolves with the fallback when the promise never settles in time", async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<string>(() => {});
    const pending = withTimeout(neverSettles, 5000, "fallback");
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBe("fallback");
    vi.useRealTimers();
  });

  it("still rejects normally when the promise rejects before the timeout", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000, "fallback")).rejects.toThrow("boom");
  });
});
