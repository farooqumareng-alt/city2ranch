"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
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

  // Same reasoning as assign-driver.ts — both the queue and the
  // dashboard need to reflect a cancel/fail immediately.
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
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
