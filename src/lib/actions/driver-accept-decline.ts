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
 * Accept/decline a job a driver has just been offered — the driver-side
 * half of the pending_acceptance status (see src/lib/orders/status.ts).
 * Both scoped by driverId, matching every other driver action's "never
 * trust the id alone" discipline: a driver can only accept or decline a
 * job actually assigned to them.
 */
export async function acceptJob(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention, unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return { ok: false, message: "Job not found." };

  if (order.status === "driver_assigned") return { ok: true }; // idempotent no-op

  try {
    assertTransition(order.status, "driver_assigned");
  } catch {
    return {
      ok: false,
      message: `This job can't be accepted from its current status (${order.status}).`,
    };
  }

  const updated = await db
    .update(orders)
    .set({ status: "driver_assigned", updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: `This job can't be accepted from its current status (${order.status}).`,
    };
  }

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "job_accepted",
    previousState: "pending_acceptance",
    newState: "driver_assigned",
  });

  revalidatePath("/internal/driver");
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  return { ok: true };
}

/**
 * Reverts the job to "paid" (unassigned) rather than a separate
 * "declined" state, clearing driverId/assignedAt — it falls straight
 * back into the same pool staff already work an unassigned order from
 * (operations-dashboard.ts's unassignedPaidOrders feed already queries
 * bare status === "paid" with no driverId check, so it reappears there
 * with zero changes needed to that query). Reason is optional and kept
 * low-friction — declining should never require typing to complete.
 */
export async function declineJob(
  orderId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const driver = await requireDriver();
  const user = await getCurrentUser();
  const reason = String(formData.get("reason") ?? "").trim() || undefined;

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return { ok: false, message: "Job not found." };

  try {
    assertTransition(order.status, "paid");
  } catch {
    return {
      ok: false,
      message: `This job can't be declined from its current status (${order.status}).`,
    };
  }

  const updated = await db
    .update(orders)
    .set({ status: "paid", driverId: null, assignedAt: null, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: `This job can't be declined from its current status (${order.status}).`,
    };
  }

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "job_declined",
    previousState: "pending_acceptance",
    newState: "paid",
    metadata: reason ? { reason } : undefined,
  });

  revalidatePath("/internal/driver");
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  return { ok: true };
}
