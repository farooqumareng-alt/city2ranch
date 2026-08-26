import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderFeeLines, orderItems } from "@/lib/db/schema";

/** Shared by the staff quote-editing page and the customer order-detail
 *  page — one place that knows how to fetch a concierge order's shopping
 *  list and quote lines. */
export async function getOrderItems(orderId: string) {
  const db = getDb();
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.sortOrder), asc(orderItems.createdAt));
}

export async function getOrderFeeLines(orderId: string) {
  const db = getDb();
  return db
    .select()
    .from(orderFeeLines)
    .where(eq(orderFeeLines.orderId, orderId))
    .orderBy(asc(orderFeeLines.sortOrder), asc(orderFeeLines.createdAt));
}
