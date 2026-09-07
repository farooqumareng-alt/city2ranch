"use client";

import Link from "next/link";

/**
 * The top nav's persistent "Request Service" button — renders on every
 * route as of 2026-09-07, panel routes included (see NavAuthControl.tsx
 * and PanelSidebar.tsx's own comments on the same change). On a
 * customer account page that already has its own "Request Service"
 * action on screen (e.g. Home's own button), this is a second path to
 * the same destination — a harmless, idempotent duplication (unlike
 * the Sign Out case this change was made alongside), not a functional
 * one: nothing is lost by having two ways to reach the same form.
 */
export function RequestServiceCta({ className }: { className: string }) {
  return (
    <Link href="/request-service" className={className}>
      Request Service
    </Link>
  );
}
