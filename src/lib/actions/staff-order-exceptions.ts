"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { isStalePaymentPending } from "@/lib/orders/money";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

async function transitionWithReason(
  formData: FormData,
  target: "cancelled" | "failed",
  action: "order_cancelled" | "order_failed",
  reasonColumn: "cancellationReason" | "failureReason",
  timestampColumn: "cancelledAt" | null
): Promise<ActionResult> {
  await requireStaff();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId || !reason) {
    return { ok: false, message: "A reason is required." };
  }

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  // Idempotent no-op — without this, cancel/fail on an order already in
  // that exact terminal state falls through assertTransition's
  // from===to short-circuit and silently overwrites the original
  // reason/timestamp with whatever was just resubmitted.
  if (order.status === target) return { ok: true };

  try {
    assertTransition(order.status, target);
  } catch {
    return {
      ok: false,
      message: `This order can't be ${target} from its current status (${order.status}).`,
    };
  }

  const updated = await db
    .update(orders)
    .set({
      status: target,
      [reasonColumn]: reason,
      ...(timestampColumn ? { [timestampColumn]: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: `This order can't be ${target} from its current status (${order.status}).`,
    };
  }

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action,
    previousState: order.status,
    newState: target,
    metadata: { reason },
  });

  // Same reasoning as assign-driver.ts — the queue, the dashboard, and
  // this order's own Service Record all need to reflect a cancel/fail
  // immediately.
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  revalidatePath(`/internal/dispatch/orders/${orderId}`);
  return { ok: true };
}

export async function cancelOrder(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return transitionWithReason(
    formData,
    "cancelled",
    "order_cancelled",
    "cancellationReason",
    "cancelledAt"
  );
}

export async function failOrder(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  return transitionWithReason(
    formData,
    "failed",
    "order_failed",
    "failureReason",
    null
  );
}

/**
 * Close out a STUCK payment_pending order (Build 3, 2026-11-04 —
 * QA-012). Normally the Stripe expired webhook reverts
 * payment_pending -> priced when a checkout session lapses; when
 * that delivery is missed, the order sits in payment_pending forever
 * (the audit found one stuck since 2026-09-09) — the customer can't
 * pay, staff can't re-quote, and the order is invisible to every
 * other flow. This is the manual version of the webhook's revert:
 * same target state, same CAS discipline, plus clearing the dead
 * session id so a fresh checkout can be created cleanly.
 *
 * The 24-hour guard (isStalePaymentPending) is the safety: a live
 * checkout session can legitimately sit in payment_pending for up to
 * a day, so anything younger is refused rather than raced against a
 * customer who might be mid-payment.
 */
export async function closeStalePayment(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, message: "Missing order." };

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  if (!isStalePaymentPending(order.status, order.updatedAt, new Date())) {
    return {
      ok: false,
      message:
        "This order isn't a stale payment — it either isn't awaiting payment, or hasn't been waiting 24 hours yet.",
    };
  }

  assertTransition(order.status, "priced");
  const updated = await db
    .update(orders)
    .set({ status: "priced", stripeCheckoutSessionId: null, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "payment_pending")))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return { ok: false, message: "This order was already updated — refresh the page and try again." };
  }

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action: "stale_payment_closed",
    previousState: "payment_pending",
    newState: "priced",
    metadata: { staleSince: order.updatedAt.toISOString(), clearedSessionId: order.stripeCheckoutSessionId },
  });

  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  revalidatePath(`/internal/dispatch/orders/${orderId}`);
  return { ok: true };
}
