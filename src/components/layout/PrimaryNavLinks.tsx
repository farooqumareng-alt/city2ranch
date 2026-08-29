"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { isPanelRoute } from "@/lib/panel-routes";

/**
 * The desktop public-marketing link list (Home/How It Works/Services/
 * Service Area/About/Contact) — hidden entirely on signed-in panel
 * routes. Two of these links are actively confusing there: "Home"
 * points to the public "/" while AccountSidebar's own "Home" points to
 * "/home" (the account dashboard), and "Services" points back out to
 * the public marketing page — the exact link AccountSidebar itself
 * already dropped for linking a customer out of their own account.
 * Client component (like NavAuthControl) so this reacts to the live
 * client-router pathname instead of a server-computed one, and so the
 * marketing pages around it stay statically prerenderable.
 */
export function PrimaryNavLinks() {
  const pathname = usePathname();
  if (isPanelRoute(pathname)) return null;

  return (
    <nav aria-label="Primary" className="hidden md:block">
      <ul className="flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-sans text-sm text-charcoal/75 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
