"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "super_admin", label: "Super Admin" },
] as const;

/**
 * Role + Status in one form, submitted together to updateStaffAccount()
 * — replaces the old separate RoleSelect + ActiveToggleButton pair
 * (2026-09-18, panel redesign). Still a client component with
 * useActionState, not a bare form: this can meaningfully fail (the
 * last-super-admin safety rail), and a bare form silently drops a
 * server action's return value.
 */
export function EditStaffAccountForm({
  action,
  currentRole,
  isActive,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  currentRole: "staff" | "manager" | "super_admin";
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="font-sans text-sm font-medium text-navy-deep">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={currentRole}
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="isActive" className="font-sans text-sm font-medium text-navy-deep">
          Status
        </label>
        <select
          id="isActive"
          name="isActive"
          defaultValue={isActive ? "true" : "false"}
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        >
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
