/**
 * Common shape every form server action resolves to. Client form
 * components render `fieldErrors` inline and `message` as a top-level
 * banner (used for both validation summaries and the "temporarily
 * unavailable" degraded state). `values` carries back what the customer
 * typed so a failed submission (validation error, or a degraded
 * DB/email dependency) never silently empties the form — the input
 * that failed the field-error check as well as one that failed for an
 * unrelated reason (e.g. RESEND_API_KEY unset) both need it.
 */
export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    };

/** Re-reads a FormData's simple (non-JSON, non-file) text fields so a
 *  failed action can hand them straight back as `values` above. */
export function valuesFromFormData(
  formData: FormData,
  keys: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

/** Flattens a Zod `flatten().fieldErrors` shape into single messages. */
export function firstFieldErrors(
  fieldErrors: Record<string, string[] | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      result[key] = messages[0];
    }
  }
  return result;
}
