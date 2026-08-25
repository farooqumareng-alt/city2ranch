"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/update-profile";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ProfileDefaults = {
  name: string | null;
  phone: string | null;
  defaultDeliveryAddressLine1: string | null;
  defaultDeliveryAddressLine2: string | null;
  defaultDeliveryCity: string | null;
  defaultDeliveryState: string | null;
  defaultDeliveryZip: string | null;
};

export function ProfileForm({ profile }: { profile: ProfileDefaults | null }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="font-sans text-sm text-navy-deep">Profile saved.</p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label="Full name"
            defaultValue={profile?.name ?? ""}
            error={fieldErrors?.name}
          />
          <TextField
            name="phone"
            type="tel"
            label="Phone"
            defaultValue={profile?.phone ?? ""}
            error={fieldErrors?.phone}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-navy-deep">
          Default Delivery Address
        </legend>
        <p className="font-sans text-xs text-charcoal/60">
          Pre-fills new City Pickup orders — still editable per order.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="defaultDeliveryAddressLine1"
            label="Address"
            className="sm:col-span-2"
            defaultValue={profile?.defaultDeliveryAddressLine1 ?? ""}
            error={fieldErrors?.defaultDeliveryAddressLine1}
          />
          <TextField
            name="defaultDeliveryAddressLine2"
            label="Address line 2"
            className="sm:col-span-2"
            defaultValue={profile?.defaultDeliveryAddressLine2 ?? ""}
            error={fieldErrors?.defaultDeliveryAddressLine2}
          />
          <TextField
            name="defaultDeliveryCity"
            label="City"
            defaultValue={profile?.defaultDeliveryCity ?? ""}
            error={fieldErrors?.defaultDeliveryCity}
          />
          <TextField
            name="defaultDeliveryState"
            label="State"
            defaultValue={profile?.defaultDeliveryState ?? ""}
            error={fieldErrors?.defaultDeliveryState}
          />
          <TextField
            name="defaultDeliveryZip"
            label="ZIP code"
            defaultValue={profile?.defaultDeliveryZip ?? ""}
            error={fieldErrors?.defaultDeliveryZip}
          />
        </div>
      </fieldset>

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}
