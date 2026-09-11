import { describe, expect, it } from "vitest";
import { canPerform } from "./staff-roles";

describe("canPerform", () => {
  it("lets super_admin manage the team", () => {
    expect(canPerform("super_admin", "manage_team")).toBe(true);
  });

  it("does not let plain staff manage the team", () => {
    expect(canPerform("staff", "manage_team")).toBe(false);
  });

  it("does not let a manager manage the team", () => {
    expect(canPerform("manager", "manage_team")).toBe(false);
  });

  it("lets manager and super_admin configure business settings", () => {
    expect(canPerform("manager", "configure_business")).toBe(true);
    expect(canPerform("super_admin", "configure_business")).toBe(true);
  });

  it("does not let plain staff configure business settings", () => {
    expect(canPerform("staff", "configure_business")).toBe(false);
  });
});
