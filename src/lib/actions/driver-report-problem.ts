"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

/**
 * Closes a real gap: before this, only staff could flag an order failed
 * (src/lib/actions/staff-order-exceptions.ts's failOrder) — a driver had
 * no in-app way to report a delivery-side problem at all. Same shape as
 * that action (reason required, assertTransition-gated, audit-logged),
 * but requireDriver()-gated and scoped by driverId match, matching
 * every other driver action's "never trust the id alone" discipline.
 */
export async function reportProblem(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId || !reason) {
    return { ok: false, message: "A reason is required." };
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  // Idempotent no-op — matches markPickedUp/markInTransit/confirmDelivery's
  // own early-returns. Without this, a repeat submission (already
  // failed, different reason text) would fall through assertTransition's
  // from===to short-circuit and silently overwrite the original
  // failureReason, destroying evidence relevant to a payment dispute.
  if (order.status === "failed") return { ok: true };

  try {
    assertTransition(order.status, "failed");
  } catch {
    return {
      ok: false,
      message: `This order can't be flagged from its current status (${order.status}).`,
    };
  }

  const updated = await db
    .update(orders)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: `This order can't be flagged from its current status (${order.status}).`,
    };
  }

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "order_failed",
    previousState: order.status,
    newState: "failed",
    metadata: { reason },
  });

  // Same reasoning as the staff equivalent — the dashboard's Needs
  // Attention feed and the queue both need to reflect this immediately.
  revalidatePath("/internal/driver");
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");

  return { ok: true };
}
