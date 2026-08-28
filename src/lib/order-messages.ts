import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderMessages } from "@/lib/db/schema";

export async function getOrderMessages(orderId: string) {
  const db = getDb();
  return db
    .select()
    .from(orderMessages)
    .where(eq(orderMessages.orderId, orderId))
    .orderBy(asc(orderMessages.createdAt));
}
