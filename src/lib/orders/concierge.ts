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

/**
 * The CURRENT quote's fee lines — only the latest version (Build 3,
 * 2026-11-04 — PRC-07). Re-finalizing a quote no longer deletes the
 * previous lines; it writes a new version, and this reader is the
 * one place that knows "current" means "highest version". Older
 * versions stay in the table as the quote's history.
 */
export async function getOrderFeeLines(orderId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(orderFeeLines)
    .where(eq(orderFeeLines.orderId, orderId))
    .orderBy(asc(orderFeeLines.sortOrder), asc(orderFeeLines.createdAt));
  if (rows.length === 0) return rows;
  const latestVersion = Math.max(...rows.map((r) => r.version));
  return rows.filter((r) => r.version === latestVersion);
}
