"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolvePickupAddress } from "@/lib/orders/pickup-address";
import { getResend } from "@/lib/email/resend";
import { driverJobOfferedEmail } from "@/lib/email/templates";
import type { ActionResult } from "@/lib/actions/types";

export async function assignDriver(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  // requireStaff() re-checked here, not just at the /internal/dispatch
  // layout — every action in this app re-verifies its own authorization.
  await requireStaff();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  if (!orderId || !driverId) {
    return { ok: false, message: "Select a driver." };
  }

  const db = getDb();
  const rows = await db
    .select({
      status: orders.status,
      serviceType: orders.serviceType,
      deliveryCity: orders.deliveryCity,
      deliveryState: orders.deliveryState,
      pickupAddressLine1: orders.pickupAddressLine1,
      pickupAddressLine2: orders.pickupAddressLine2,
      pickupCity: orders.pickupCity,
      pickupState: orders.pickupState,
      pickupZip: orders.pickupZip,
      storeName: stores.name,
      storeAddressLine1: stores.addressLine1,
      storeCity: stores.city,
      storeState: stores.state,
      storeZip: stores.zip,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  // A driver can't be sent to a pickup with no known address — a
  // brand-only store (see the comment on stores.addressLine1 in
  // schema.ts) has none of its own, so this only ever blocks City
  // Pickup, and only until a dispatcher fills one in (see
  // update-pickup-address.ts). Never trust that the Service Record's
  // own UI-level gate alone kept this from being submitted anyway —
  // same discipline as every other action in this app.
  if (order.serviceType === "pickup" && !resolvePickupAddress(order)) {
    return {
      ok: false,
      message: "Add a pickup address for this order before assigning a driver.",
    };
  }

  try {
    assertTransition(order.status, "pending_acceptance");
  } catch {
    return {
      ok: false,
      message: `This order can't be assigned from its current status (${order.status}).`,
    };
  }

  // Compare-and-swap on status: without this, two staff members
  // assigning different drivers to the same order at nearly the same
  // moment could both pass the assertTransition check above (both read
  // the pre-assignment status) and both write — the second silently
  // overwriting the first's driverId with no indication anything raced.
  //
  // Lands on pending_acceptance, not driver_assigned — the driver still
  // has to accept (see driver-accept-decline.ts) before they're
  // genuinely committed to the job.
  const updated = await db
    .update(orders)
    .set({
      driverId,
      status: "pending_acceptance",
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: "This order changed while you were working on it. Refresh and try again.",
    };
  }

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action: "driver_assigned",
    previousState: order.status,
    newState: "pending_acceptance",
    metadata: { driverId },
  });

  // All three: the queue (where this order actually lives), the
  // dashboard (whose stats/Needs-Attention feed this mutation affects),
  // and this order's own Service Record — without these an unrelated
  // navigation would be needed to see anything refresh.
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  revalidatePath(`/internal/dispatch/orders/${orderId}`);

  // Best-effort, like every other email send in this codebase — never
  // blocks the assignment itself. Closes lifecycle audit issue #8's
  // other half: a driver used to get zero notification of any kind and
  // had to proactively check the app. drivers has no email column of
  // its own (see schema.ts) — resolved via the same raw auth.users
  // subquery pattern household.ts's ownerEmailSubquery already uses,
  // for the same reason: importing the real table isn't safe (see that
  // file's comment on why).
  try {
    const [driverRow] = await db
      .select({
        name: drivers.name,
        email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${drivers.authUserId})`,
      })
      .from(drivers)
      .where(eq(drivers.id, driverId));
    if (driverRow?.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const resend = getResend();
      const { subject, html } = driverJobOfferedEmail({
        driverName: driverRow.name,
        storeName: order.serviceType === "pickup" ? order.storeName : null,
        deliveryCity: order.deliveryCity,
        deliveryState: order.deliveryState,
        jobUrl: `${siteUrl}/internal/driver/${orderId}`,
      });
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
        to: driverRow.email,
        subject,
        html,
      });
    }
  } catch (error) {
    console.error("[assignDriver] driver notification email failed", error);
  }

  return { ok: true };
}
