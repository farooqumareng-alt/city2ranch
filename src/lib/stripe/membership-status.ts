import type Stripe from "stripe";

/**
 * Stripe's subscription.status has more states than this app's UI needs
 * to distinguish (see membershipStatusEnum's doc comment in
 * src/lib/db/schema.ts) — collapse down to the three we actually act
 * on. Pure function (like src/lib/orders/status.ts) so it's unit
 * testable without pulling in the webhook route's @/lib/db import.
 *
 * Anything not explicitly active-like or failing-like (a future Stripe
 * status this code doesn't know about yet) is treated as canceled
 * rather than silently left "active" — access should never fail open
 * for a billing state we don't recognize.
 */
export function toMembershipStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "canceled";
}
