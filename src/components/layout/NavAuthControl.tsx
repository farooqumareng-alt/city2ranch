"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/sign-out";
import { isPanelRoute } from "@/lib/panel-routes";

/**
 * The only part of the Nav that depends on the auth session — resolved
 * client-side (not via a server-side cookie read) specifically so the
 * marketing pages around it stay statically prerenderable rather than
 * every route bailing into per-request dynamic rendering. This is
 * decorative UI only (which link to show); it is never the security
 * boundary — /orders and /internal/* always re-verify the session
 * server-side (getCurrentUser() / requireStaff() / requireDriver())
 * regardless of what this renders.
 */
export function NavAuthControl({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSignedIn(Boolean(session?.user));
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Unknown yet (first client paint, before getUser() resolves): render
  // nothing rather than guessing, to avoid a visible flash from the
  // wrong guess in the common case (already signed in).
  if (signedIn === null) {
    return <span className="inline-block h-5 w-16" aria-hidden />;
  }

  if (!signedIn) {
    const linkClass =
      variant === "desktop"
        ? "font-sans text-sm text-charcoal/75 transition-colors hover:text-gold"
        : "block py-1 font-sans text-base text-navy-deep hover:text-gold";
    return (
      <Link href="/sign-in" className={linkClass}>
        Sign In
      </Link>
    );
  }

  // On /orders/*, /profile, and /internal/*, a PanelSidebar already
  // renders its own account nav + Sign Out — showing it again here would
  // just be a second, redundant surface. Nothing to render; "Request a
  // Pickup" (desktop) / the hamburger's other links (mobile) stand alone.
  if (isPanelRoute(pathname)) {
    return null;
  }

  // Desktop: account management (Orders/Profile/Sign Out) collapses into
  // one "My Account" menu — a single control competing with "Request a
  // Pickup" for attention, not three. Mobile: the hamburger panel is
  // already a full expanded menu, so a nested dropdown inside it would
  // just add friction — list the items directly, as before.
  if (variant === "desktop") {
    return <DesktopAccountMenu />;
  }

  // Just the entry point, not every account page — once on any account
  // page, AccountSidebar already lists everything. A second full copy of
  // that list here was exactly the "text-heavy navigation" to avoid.
  const mobileLinkClass = "block py-1 font-sans text-base text-navy-deep hover:text-gold";
  return (
    <>
      <Link href="/home" className={mobileLinkClass}>
        My Account
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="py-1 font-sans text-base text-charcoal/60 hover:text-gold"
        >
          Sign Out
        </button>
      </form>
    </>
  );
}

function DesktopAccountMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuItemClass =
    "block px-4 py-2 font-sans text-sm text-charcoal/75 transition-colors hover:bg-ivory hover:text-gold";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 font-sans text-sm text-charcoal/75 transition-colors hover:text-gold"
      >
        My Account
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-sm border border-navy/10 bg-white py-2 shadow-lg"
        >
          {/* Just the entry point — AccountSidebar lists everything else
              once you're on any account page, so this dropdown doesn't
              need to be a second copy of that list to keep in sync. */}
          <Link href="/home" role="menuitem" className={menuItemClass} onClick={() => setOpen(false)}>
            My Account
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className={`w-full text-left ${menuItemClass}`}
            >
              Sign Out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
