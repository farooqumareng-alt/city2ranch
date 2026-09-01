import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { getNotificationsSummary } from "@/lib/actions/notifications";

/**
 * The bridge for NotificationBell.tsx (a client component — it can't
 * call a DB-backed function directly, and can't be a Server Component
 * itself without breaking the marketing pages' static prerendering,
 * same reasoning as NavAuthControl.tsx being client-side). Returns
 * nothing for a signed-out visitor rather than a real 401 — the bell
 * doesn't render at all when signed out, so this is just defense
 * against a stray request, not a real auth boundary being probed.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ unreadCount: 0, items: [] });
  }

  const ownerId = await getEffectiveOwnerId(user.id);
  const summary = await getNotificationsSummary(ownerId);
  return NextResponse.json(summary);
}
