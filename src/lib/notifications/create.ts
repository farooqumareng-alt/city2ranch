import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

/**
 * Records an in-app notification. payment_confirmed/recurring_order_created
 * are a second, independent channel alongside a matching email (not
 * gated by notification_preferences — see the doc comment on the
 * notifications table in schema.ts: a customer who opted out of the
 * email still gets the in-app record). driver_accepted/order_completed
 * (2026-09-09) have no matching email yet — bell-only for now, a
 * smaller, separate gap than the one that added them. Best-effort,
 * like every other non-critical side effect around the flows that call
 * this: catches and logs rather than throwing, so a failure here never
 * blocks the real state change (payment confirmation, recurring-order
 * creation, a driver accepting a job, a delivery being completed).
 */
export async function createNotification(fields: {
  authUserId: string;
  type: "payment_confirmed" | "recurring_order_created" | "driver_accepted" | "order_completed";
  title: string;
  body?: string;
  orderId?: string;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(notifications).values({
      authUserId: fields.authUserId,
      type: fields.type,
      title: fields.title,
      body: fields.body,
      orderId: fields.orderId,
    });
  } catch (error) {
    console.error("[createNotification] failed", error);
  }
}
