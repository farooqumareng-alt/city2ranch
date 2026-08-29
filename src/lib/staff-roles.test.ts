import { describe, expect, it } from "vitest";
import { canPerform } from "./staff-roles";

describe("canPerform", () => {
  it("lets super_admin manage the team", () => {
    expect(canPerform("super_admin", "manage_team")).toBe(true);
  });

  it("does not let plain staff manage the team", () => {
    expect(canPerform("staff", "manage_team")).toBe(false);
  });
});
