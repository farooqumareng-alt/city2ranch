import { describe, expect, it } from "vitest";
import { canPerform, type HouseholdAction, type HouseholdRole } from "./household-roles";

const ALL_ACTIONS: HouseholdRole[] = ["full", "ordering", "view_only"];

describe("canPerform", () => {
  it("lets full access do everything", () => {
    for (const action of ["pay", "place_order", "manage_places"] as HouseholdAction[]) {
      expect(canPerform("full", action)).toBe(true);
    }
  });

  it("lets ordering place orders and manage places, but not pay", () => {
    expect(canPerform("ordering", "place_order")).toBe(true);
    expect(canPerform("ordering", "manage_places")).toBe(true);
    expect(canPerform("ordering", "pay")).toBe(false);
  });

  it("lets view_only do nothing", () => {
    for (const action of ["pay", "place_order", "manage_places"] as HouseholdAction[]) {
      expect(canPerform("view_only", action)).toBe(false);
    }
  });

  it("never grants an action to a role that isn't full", () => {
    // Regression guard: "pay" moves real money, so it must stay
    // exclusive to "full" no matter how the role set grows later.
    for (const role of ALL_ACTIONS) {
      if (role !== "full") expect(canPerform(role, "pay")).toBe(false);
    }
  });
});
