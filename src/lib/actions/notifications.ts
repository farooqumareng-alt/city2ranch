"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";

const RECENT_LIMIT = 10;

/** Used by GET /api/notifications — a client component can't call a
 *  DB-backed function directly, so that route is the bridge. */
export async function getNotificationsSummary(ownerId: string) {
  const db = getDb();
  const [unread, recent] = await Promise.all([
    db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.authUserId, ownerId), isNull(notifications.readAt))),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.authUserId, ownerId))
      .orderBy(desc(notifications.createdAt))
      .limit(RECENT_LIMIT),
  ]);

  return { unreadCount: unread.length, items: recent };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.authUserId, ownerId), isNull(notifications.readAt)));
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.authUserId, ownerId), isNull(notifications.readAt)));
}
