"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { NavAuthControl } from "@/components/layout/NavAuthControl";
import { isPanelRoute } from "@/lib/panel-routes";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // PanelSidebar (see AccountSidebar/StaffSidebar/DriverSidebar) already
  // renders every link this menu would, plus Sign Out, as its own
  // horizontal scroll row on mobile — the hamburger here would only open
  // onto a redundant second copy of the same navigation.
  if (isPanelRoute(pathname)) return null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-navy-deep focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {/* Rendered (not conditionally mounted) so the server-rendered
          authSlot inside stays part of the initial payload; visibility is
          toggled with CSS instead of unmounting, keeping the open/close
          interaction purely client-side. */}
      <div
        id="mobile-nav-panel"
        hidden={!open}
        className="absolute inset-x-0 top-full border-t border-navy/10 bg-ivory px-6 py-6"
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-1 font-sans text-base text-navy-deep hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex flex-col gap-4">
              <NavAuthControl variant="mobile" />
            </li>
            <li className="pt-2">
              <Link
                href="/request-service"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-sm bg-gold px-6 py-2.5 font-sans text-sm font-medium text-navy-deep"
              >
                Request Service
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
