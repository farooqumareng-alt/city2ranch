"use client";

import { useActionState } from "react";
import { submitContact } from "@/lib/actions/contact";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export function ContactForm({ subjectPrefill }: { subjectPrefill?: string }) {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  if (state?.ok) {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
        <p className="font-serif text-lg text-navy-deep">Message received.</p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          A member of the City2Ranch team will get back to you shortly.
        </p>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Full name" required error={fieldErrors?.name} />
        <TextField name="email" type="email" label="Email" required error={fieldErrors?.email} />
        <TextField name="phone" type="tel" label="Phone" error={fieldErrors?.phone} />
        <TextField
          name="subject"
          label="Subject"
          required
          defaultValue={subjectPrefill}
          error={fieldErrors?.subject}
        />
      </div>
      <TextareaField name="message" label="Message" required error={fieldErrors?.message} />
      <Button type="submit" variant="navy" disabled={pending} className="self-start">
        {pending ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
