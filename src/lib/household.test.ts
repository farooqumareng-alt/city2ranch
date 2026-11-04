import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for the QA audit's C2R-QA-001/002 fix: account
// getters that take an owner id must verify it against the caller's
// session (isCallerEffectiveOwner in household.ts). The session and
// the household lookup are mocked; the DB fake only answers the one
// household-members query getEffectiveOwnerId makes.
const getCurrentUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

let memberRows: { ownerAuthUserId: string }[] = [];
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: async () => memberRows,
      }),
    }),
  }),
}));

import { isCallerEffectiveOwner } from "./household";

describe("isCallerEffectiveOwner", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    memberRows = [];
  });

  it("rejects a signed-out caller", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await isCallerEffectiveOwner("user-1")).toBe(false);
  });

  it("accepts the caller's own id and rejects anyone else's", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-own" });
    expect(await isCallerEffectiveOwner("user-own")).toBe(true);
    expect(await isCallerEffectiveOwner("user-other")).toBe(false);
  });

  it("accepts the household owner's id for a delegated member, and nothing else", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "member-1" });
    memberRows = [{ ownerAuthUserId: "owner-1" }];
    expect(await isCallerEffectiveOwner("owner-1")).toBe(true);
    expect(await isCallerEffectiveOwner("member-1")).toBe(false);
    expect(await isCallerEffectiveOwner("owner-2")).toBe(false);
  });
});
