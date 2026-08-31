"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

/**
 * Create form — category is free text (matches the schema's own doc
 * comment: "expected to evolve without a schema migration"), with a
 * native <datalist> of existing categories for consistency rather than
 * a closed dropdown (SelectField hardcodes defaultValue="" internally
 * and has no way to pre-fill a re-submitted value, so a plain text input
 * + datalist is both simpler and more correct here).
 */
export function NewGroceryItemForm({
  action,
  existingCategories,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  existingCategories: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="name"
          label="Item name"
          placeholder="e.g. Whole Milk"
          required
          defaultValue={values?.name}
          error={fieldErrors?.name}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="font-sans text-sm font-medium text-navy-deep">
            Category<span className="text-gold"> *</span>
          </label>
          <input
            id="category"
            name="category"
            list="existing-categories"
            required
            defaultValue={values?.category}
            className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
            placeholder="e.g. Dairy & Eggs"
          />
          <datalist id="existing-categories">
            {existingCategories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          {fieldErrors?.category ? (
            <p role="alert" className="font-sans text-xs text-red-600">
              {fieldErrors.category}
            </p>
          ) : null}
          <p className="font-sans text-xs text-charcoal/60">
            Pick an existing category to keep this item grouped with similar ones, or type a new one.
          </p>
        </div>
      </div>

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Item"}
      </Button>
    </form>
  );
}

/** Edit form — name only. See the doc comment on updateGroceryItem in
 *  grocery-item-management.ts for why category/position aren't editable
 *  here. */
export function EditGroceryItemForm({
  action,
  currentName,
  category,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  currentName: string;
  category: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <p className="font-sans text-sm text-charcoal/70">
        Category: <span className="text-navy-deep">{category}</span> — to move this item to a different
        category, delete it and add it again there.
      </p>

      <TextField
        name="name"
        label="Item name"
        required
        defaultValue={values?.name ?? currentName}
        error={fieldErrors?.name}
      />

      <Button type="submit" variant="navy" size="lg" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
