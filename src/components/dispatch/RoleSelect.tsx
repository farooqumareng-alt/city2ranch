"use client";

import { useActionState } from "react";
import { setStaffRole } from "@/lib/actions/team-management";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "super_admin", label: "Super Admin" },
] as const;

/**
 * Replaces the old two-state RoleToggleButton (2026-09-11, alongside
 * the new "manager" tier) — a promote/demote toggle only made sense
 * for a binary staff/super_admin choice; a real <select> is what a
 * three-way one actually needs. Still its own client component with
 * useActionState, for the same reason RoleToggleButton was: this
 * action can meaningfully fail (the last-super-admin safety rail), and
 * a bare form silently drops a server action's return value.
 */
export function RoleSelect({
  staffId,
  currentRole,
}: {
  staffId: string;
  currentRole: "staff" | "manager" | "super_admin";
}) {
  const boundAction = setStaffRole.bind(null, staffId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="role"
          defaultValue={currentRole}
          className="rounded-sm border border-navy/20 bg-white px-3 py-2 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline-dark" size="md" disabled={pending}>
          {pending ? "Saving…" : "Update Role"}
        </Button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
