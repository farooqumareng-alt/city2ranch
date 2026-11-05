"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orderRefunds, orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { logAuditEvent } from "@/lib/audit";
import { refundableBalanceCents } from "@/lib/orders/money";
import type { ActionResult } from "@/lib/actions/types";

/**
 * Issue a refund against an order's captured payment (Build 3,
 * 2026-11-04 — PRC-06). Manual-with-prompt by design: staff issue
 * refunds from the Service Record; cancelling a paid order never
 * auto-refunds, it surfaces the amount still held so a human decides
 * (a cancelled order might legitimately keep a fee someday — that
 * policy call belongs to a person, not a webhook).
 *
 * Safety shape:
 * - Staff only; a reason is required and lands in the audit event.
 * - The amount defaults to the full refundable balance and can never
 *   exceed it (succeeded + in-flight refunds reserve their amounts —
 *   see refundableBalanceCents).
 * - The refund row is inserted as "pending" BEFORE the Stripe call
 *   and its id is the Stripe idempotency key, so a double-submit or
 *   a retried request can never produce two Stripe refunds.
 * - A Stripe failure resolves the row to "failed" with the error and
 *   changes nothing else — the order keeps its money and its state.
 */
export async function issueOrderRefund(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const staffMember = await requireStaff();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amountRaw = String(formData.get("amountDollars") ?? "").trim();
  if (!orderId || !reason) {
    return { ok: false, message: "A refund reason is required." };
  }

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  if (!order.paidAt || !order.stripePaymentIntentId) {
    return { ok: false, message: "This order has no captured payment to refund." };
  }

  const existing = await db.select().from(orderRefunds).where(eq(orderRefunds.orderId, orderId));
  const balance = refundableBalanceCents(order.totalCents, existing);
  if (balance <= 0) {
    return { ok: false, message: "This order has already been fully refunded." };
  }

  let amountCents = balance;
  if (amountRaw) {
    const parsed = Math.round(Number(amountRaw) * 100);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, message: "Enter a refund amount greater than $0, or leave it blank for the full balance." };
    }
    amountCents = parsed;
  }
  if (amountCents > balance) {
    return {
      ok: false,
      message: `That exceeds the refundable balance of $${(balance / 100).toFixed(2)}.`,
    };
  }

  const inserted = await db
    .insert(orderRefunds)
    .values({
      orderId,
      amountCents,
      reason,
      status: "pending",
      actorStaffId: staffMember.id,
    })
    .returning({ id: orderRefunds.id });
  const refundId = inserted[0].id;

  try {
    const stripe = getStripe();
    const stripeRefund = await stripe.refunds.create(
      { payment_intent: order.stripePaymentIntentId, amount: amountCents },
      { idempotencyKey: refundId }
    );
    await db
      .update(orderRefunds)
      .set({ status: "succeeded", stripeRefundId: stripeRefund.id })
      .where(eq(orderRefunds.id, refundId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe refund failed.";
    await db
      .update(orderRefunds)
      .set({ status: "failed", error: message })
      .where(eq(orderRefunds.id, refundId));
    console.error("[issueOrderRefund] Stripe refund failed", error);
    return { ok: false, message: `Stripe couldn't process that refund: ${message}` };
  }

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action: "refund_issued",
    previousState: order.status,
    newState: order.status,
    metadata: { refundId, amountCents, reason },
  });

  revalidatePath(`/internal/dispatch/orders/${orderId}`);
  revalidatePath(`/my-services/${orderId}`);
  return { ok: true };
}
