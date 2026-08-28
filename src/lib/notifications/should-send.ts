import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { resolveNotifyDecision, type NotificationCategory } from "./decision";

export type { NotificationCategory } from "./decision";

/**
 * Whether authUserId wants to receive emails in the given category.
 * Fails open: if the lookup itself throws, default to sending, since
 * this gate protects a non-critical, best-effort email, and losing a
 * receipt because our own preferences lookup broke would be worse than
 * sending an unwanted one.
 */
export async function shouldNotify(
  authUserId: string,
  category: NotificationCategory
): Promise<boolean> {
  try {
    const db = getDb();
    const rows = await db
      .select({ paymentReceipts: notificationPreferences.paymentReceipts })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.authUserId, authUserId));

    return resolveNotifyDecision(rows[0], category);
  } catch (error) {
    console.error("[shouldNotify] preference lookup failed, defaulting to send", error);
    return true;
  }
}
