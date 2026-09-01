import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

/**
 * Human-facing labels for audit_events.action — the same table every
 * order-status-changing action already writes to (see src/lib/audit.ts),
 * just relabeled for a person reading their own order rather than
 * debugging one at the database level. Shared as-is by both the
 * customer's Service Detail and the staff Service Record (Phase 3) —
 * one label set, not two. This is a display layer only: no second
 * state machine, no new writes, no schema change. Unmapped actions
 * fall back to the raw action string rather than crashing.
 *
 * "order_claimed" is deliberately omitted — it's internal bookkeeping
 * (a customer attaching their own name to an order staff created
 * before they signed in), not a step in the delivery itself, so it's
 * filtered out of the timeline entirely rather than labeled.
 *
 * "job_accepted"/"job_declined" (the driver Accept/Decline flow — see
 * pending_acceptance in src/lib/orders/status.ts) are hidden the same
 * way, matching the approved UX blueprint's own exception model: a
 * decline reassigns behind the scenes and "the customer sees no
 * regression." The "Driver assigned" entry below already fires the
 * moment staff offers the job (pending_acceptance), which reads fine
 * to a customer either way — they were never shown a decline to begin
 * with, so a reassignment just looks like a second, ordinary "Driver
 * assigned" entry rather than a correction.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  order_submitted: "Request submitted",
  concierge_order_created: "Request received",
  quote_finalized: "Quote ready",
  quote_reopened: "Quote updated",
  checkout_started: "Payment started",
  payment_succeeded: "Payment received",
  checkout_expired: "Payment session expired — you can try again",
  driver_assigned: "Driver assigned",
  order_picked_up: "Picked up",
  order_in_transit: "On the way",
  order_delivered: "Delivered",
  order_cancelled: "Cancelled",
  order_failed: "Needs attention",
};

// This same filtered/relabeled timeline is reused as-is on the staff
// Service Record page (Phase 3) — meaning staff currently can't see a
// decline in the timeline either. Disclosed limitation, not a silent
// omission: a real staff-facing timeline (unfiltered, with actor names)
// is deferred rather than built partway.
const HIDDEN_FROM_TIMELINE = new Set(["order_claimed", "job_accepted", "job_declined"]);

export type TimelineEntry = {
  id: string;
  createdAt: Date;
  label: string;
};

/** One order's timeline, oldest first, customer-safe labels only. */
export async function getOrderTimeline(orderId: string): Promise<TimelineEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: auditEvents.id,
      createdAt: auditEvents.createdAt,
      action: auditEvents.action,
      newState: auditEvents.newState,
    })
    .from(auditEvents)
    .where(eq(auditEvents.orderId, orderId))
    .orderBy(desc(auditEvents.createdAt));

  return rows
    .filter((row) => !HIDDEN_FROM_TIMELINE.has(row.action))
    .map((row) => ({
      id: row.id,
      // Wrapped defensively, matching every other timestamp render in
      // this codebase (e.g. orders/[id]/page.tsx) — postgres-js returns
      // a real Date for a timestamptz column, but re-wrapping costs
      // nothing and guards against ever assuming that silently.
      createdAt: new Date(row.createdAt),
      label: AUDIT_ACTION_LABELS[row.action] ?? row.action,
    }))
    .reverse();
}
