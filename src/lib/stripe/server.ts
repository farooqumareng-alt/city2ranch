import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Lazily builds the Stripe client. Same shape as getDb()/getResend() —
 * reads STRIPE_SECRET_KEY at call time (not module load), so a missing
 * key surfaces as a catchable error rather than a startup crash.
 */
export function getStripe(): Stripe {
  if (cached) return cached;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  cached = new Stripe(apiKey);
  return cached;
}
