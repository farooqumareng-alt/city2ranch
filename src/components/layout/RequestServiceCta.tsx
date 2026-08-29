"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPanelRoute } from "@/lib/panel-routes";

/**
 * The top nav's persistent "Request Service" button — hidden on
 * signed-in panel routes, where it duplicates a page-level "Request
 * Service" action that's already on screen (e.g. /home, /requests).
 * Same reasoning as AccountSidebar dropping its own "Services" entry:
 * one path to the same destination, not two competing ones.
 */
export function RequestServiceCta({ className }: { className: string }) {
  const pathname = usePathname();
  if (isPanelRoute(pathname)) return null;

  return (
    <Link href="/request-service" className={className}>
      Request Service
    </Link>
  );
}
