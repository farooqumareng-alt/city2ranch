import { describe, expect, it } from "vitest";
import { canPerform, type HouseholdAction, type HouseholdRole } from "./household-roles";

const ALL_ACTIONS: HouseholdRole[] = ["full", "ordering", "view_only"];

const EVERY_ACTION: HouseholdAction[] = [
  "pay",
  "place_order",
  "manage_places",
  "manage_lists",
  "manage_profile",
  "manage_notifications",
  "message",
];

describe("canPerform", () => {
  it("lets full access do everything", () => {
    for (const action of EVERY_ACTION) {
      expect(canPerform("full", action)).toBe(true);
    }
  });

  it("lets ordering place orders and manage places, but not pay", () => {
    expect(canPerform("ordering", "place_order")).toBe(true);
    expect(canPerform("ordering", "manage_places")).toBe(true);
    expect(canPerform("ordering", "pay")).toBe(false);
  });

  it("lets view_only do nothing", () => {
    for (const action of EVERY_ACTION) {
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

  // Security remediation (2026-08-30): these six actions used to have
  // no gate at all, so a view_only member could write the owner's
  // shopping lists, profile, notification preferences, and order
  // messages, and could claim an unclaimed order on the owner's
  // behalf. Locked in here so "view_only" can't silently regress back
  // to meaning nothing.
  it("gates lists, profile, and messaging the same as manage_places (full + ordering, never view_only)", () => {
    for (const action of ["manage_lists", "manage_profile", "message"] as HouseholdAction[]) {
      expect(canPerform("full", action)).toBe(true);
      expect(canPerform("ordering", action)).toBe(true);
      expect(canPerform("view_only", action)).toBe(false);
    }
  });

  it("gates notification preferences full-only, like pay — it controls what the owner is told about their own billing", () => {
    expect(canPerform("full", "manage_notifications")).toBe(true);
    expect(canPerform("ordering", "manage_notifications")).toBe(false);
    expect(canPerform("view_only", "manage_notifications")).toBe(false);
  });
});
