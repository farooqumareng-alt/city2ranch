import type { OrderStatus } from "@/lib/orders/status";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";

type Tone = "success" | "warning" | "critical" | "neutral";

// priced/paid/pending_acceptance are "warning" — deliberately: these
// are exactly the stall points that need a response from someone
// (awaiting payment, awaiting a driver, awaiting that driver's
// accept/decline), so the badge reinforces the same signal
// src/lib/operations-dashboard.ts's Needs Attention feed surfaces
// rather than inventing its own.
const STATUS_TONE: Record<OrderStatus, Tone> = {
  quote_pending: "neutral",
  priced: "warning",
  payment_pending: "neutral",
  paid: "warning",
  pending_acceptance: "warning",
  driver_assigned: "neutral",
  picked_up: "neutral",
  in_transit: "neutral",
  completed: "success",
  cancelled: "neutral",
  failed: "critical",
};

// Reuses Tailwind's stock palette — the same one every form error in
// this app already uses (text-red-600 at 20+ call sites), not a new
// convention. "neutral" gets a navy tint rather than generic gray, so
// the one high-frequency tone still reads as branded — and, deliberately,
// none of the four tones touches gold: status color and brand/CTA color
// must never be confusable with each other.
const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-navy/5 text-navy-deep border-navy/15",
};

/** A colored status pill for an order — every existing render of
 *  ORDER_STATUS_LABELS across the app is plain, uncolored text today
 *  (quote_pending and completed look identical); this is the first
 *  place status gets a semantic color. Label text still comes from
 *  ORDER_STATUS_LABELS — one source of truth, not duplicated copy. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium whitespace-nowrap ${TONE_CLASSES[STATUS_TONE[status]]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
