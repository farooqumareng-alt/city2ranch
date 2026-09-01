import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

/**
 * Records an in-app notification — a second, independent channel from
 * the email this is always called alongside (see the doc comment on
 * the notifications table in schema.ts: not gated by
 * notification_preferences, since a customer who opted out of the
 * email still gets the in-app record). Best-effort, like every other
 * non-critical side effect around the payment/cron flows that call
 * this: catches and logs rather than throwing, so a failure here never
 * blocks the payment confirmation or recurring-order creation itself.
 */
export async function createNotification(fields: {
  authUserId: string;
  type: "payment_confirmed" | "recurring_order_created";
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
