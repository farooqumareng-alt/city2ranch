/**
 * Common shape every form server action resolves to. Client form
 * components render `fieldErrors` inline and `message` as a top-level
 * banner (used for both validation summaries and the "temporarily
 * unavailable" degraded state).
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

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
