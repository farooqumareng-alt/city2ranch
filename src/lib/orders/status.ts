/**
 * The real enforcement point for order state changes. Every action that
 * mutates `orders.status` (Tasks 10–13) must call `assertTransition`
 * before writing — this is what stops a replayed webhook, a duplicate
 * driver tap, or a stale page from silently corrupting state.
 */
export const ORDER_STATUSES = [
  // Concierge orders only — created before staff has finished building a
  // quote (no automated pricing engine for Concierge). City Pickup orders
  // skip straight to "priced", since their price is computed instantly.
  "quote_pending",
  "priced",
  "payment_pending",
  "paid",
  "driver_assigned",
  "picked_up",
  "in_transit",
  "completed",
  "cancelled",
  "failed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Staff finishes building the quote (fee lines finalized) -> priced.
  // Never reached by City Pickup orders, which are created already priced.
  quote_pending: ["priced", "cancelled"],
  // Customer approves the price -> Stripe Checkout session created.
  // priced -> quote_pending: staff reopening a concierge quote to fix a
  // mistake before the customer has started checkout — same shape as the
  // payment_pending -> priced revert-on-expiry below, just one step
  // earlier in the flow.
  priced: ["payment_pending", "cancelled", "quote_pending"],
  // Stripe webhook confirms payment, or the Checkout session expires
  // (reverts to priced so the customer can retry).
  payment_pending: ["paid", "priced", "cancelled"],
  // Staff assigns a driver from the dispatch queue.
  paid: ["driver_assigned", "cancelled"],
  // Driver picks up the order, or a pickup-side problem occurs (store
  // couldn't find the order, order not ready, etc.) — that's a failure,
  // not a cancellation, since the customer already paid.
  driver_assigned: ["picked_up", "cancelled", "failed"],
  // Once physically in the driver's hands, "cancel" no longer applies —
  // only a delivery-side failure can stop it.
  picked_up: ["in_transit", "failed"],
  in_transit: ["completed", "failed"],
  // Terminal states.
  completed: [],
  cancelled: [],
  failed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // no-op — safe to treat a retry as success
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export class IllegalOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Illegal order status transition: ${from} -> ${to}`);
    this.name = "IllegalOrderTransitionError";
  }
}

/** Throws IllegalOrderTransitionError if the transition isn't legal. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalOrderTransitionError(from, to);
  }
}
