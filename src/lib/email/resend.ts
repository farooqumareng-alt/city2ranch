import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Lazily builds the Resend client. Like `getDb`, this reads
 * `RESEND_API_KEY` at call time (not module load) so a missing key
 * surfaces as a catchable error rather than a startup crash.
 */
export function getResend(): Resend {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  cached = new Resend(apiKey);
  return cached;
}
