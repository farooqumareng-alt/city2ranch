"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type DriverHiringDefaults = {
  licenseNumber: string | null;
  licenseExpiresOn: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehiclePlate: string | null;
  insuranceCarrier: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiresOn: string | null;
};

/**
 * License/vehicle/insurance fields on the Driver Profile page — every
 * field optional, filled in as hiring paperwork actually comes in (see
 * driverHiringInfoSchema's own comment). Bound to
 * updateDriverHiringInfo.bind(null, driverId), same shape as every
 * other edit-in-place admin form in this app (StoreForm, etc.).
 */
export function DriverHiringForm({
  action,
  defaults,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  defaults: DriverHiringDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <p className="font-sans text-sm text-navy-deep">Saved.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="licenseNumber"
          label="Driver's license #"
          defaultValue={defaults.licenseNumber ?? ""}
          error={fieldErrors?.licenseNumber}
        />
        <TextField
          name="licenseExpiresOn"
          type="date"
          label="License expires"
          defaultValue={defaults.licenseExpiresOn ?? ""}
          error={fieldErrors?.licenseExpiresOn}
        />
        <TextField
          name="vehicleMake"
          label="Vehicle make"
          defaultValue={defaults.vehicleMake ?? ""}
          error={fieldErrors?.vehicleMake}
        />
        <TextField
          name="vehicleModel"
          label="Vehicle model"
          defaultValue={defaults.vehicleModel ?? ""}
          error={fieldErrors?.vehicleModel}
        />
        <TextField
          name="vehicleYear"
          label="Vehicle year"
          inputMode="numeric"
          defaultValue={defaults.vehicleYear ?? ""}
          error={fieldErrors?.vehicleYear}
        />
        <TextField
          name="vehiclePlate"
          label="License plate"
          defaultValue={defaults.vehiclePlate ?? ""}
          error={fieldErrors?.vehiclePlate}
        />
        <TextField
          name="insuranceCarrier"
          label="Insurance carrier"
          defaultValue={defaults.insuranceCarrier ?? ""}
          error={fieldErrors?.insuranceCarrier}
        />
        <TextField
          name="insurancePolicyNumber"
          label="Policy #"
          defaultValue={defaults.insurancePolicyNumber ?? ""}
          error={fieldErrors?.insurancePolicyNumber}
        />
        <TextField
          name="insuranceExpiresOn"
          type="date"
          label="Insurance expires"
          defaultValue={defaults.insuranceExpiresOn ?? ""}
          error={fieldErrors?.insuranceExpiresOn}
        />
      </div>

      <Button type="submit" variant="navy" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Details"}
      </Button>
    </form>
  );
}
