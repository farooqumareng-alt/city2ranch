import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderRefunds } from "@/lib/db/schema";

/** Every refund attempt against an order, newest first — the Service
 *  Record's payment history. Includes failed attempts on purpose:
 *  staff should see that a refund was tried and why it didn't land,
 *  not just the ones that worked. */
export async function getOrderRefunds(orderId: string) {
  const db = getDb();
  return db
    .select()
    .from(orderRefunds)
    .where(eq(orderRefunds.orderId, orderId))
    .orderBy(desc(orderRefunds.createdAt));
}
