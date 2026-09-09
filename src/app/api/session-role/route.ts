import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/roles";

/**
 * The bridge for NavAuthControl.tsx's role-aware "My Account" menu
 * (2026-09-08, Priority 3 of the master implementation directive) — a
 * client component can't call resolveSessionRole() directly, same
 * reasoning as /api/notifications feeding NotificationBell.tsx.
 * Returns "customer" for a signed-out visitor rather than a real 401 —
 * NavAuthControl already gates on its own sign-in check before ever
 * rendering account-menu content, so this is defense against a stray
 * request, not a real auth boundary being probed.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ role: "customer" });
  }

  const role = await resolveSessionRole(user.id);
  return NextResponse.json({ role });
}
