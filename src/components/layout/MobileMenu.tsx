"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-ivory focus-visible:outline-2 focus-visible:outline-gold"
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

      {open ? (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-t border-ivory/10 bg-navy-deep px-6 py-6"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-1 font-sans text-base text-ivory hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/request-service"
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-sm bg-gold px-6 py-2.5 font-sans text-sm font-medium text-navy-deep"
                >
                  Request Private Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
