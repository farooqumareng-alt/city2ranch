"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/sign-out";

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

  const linkClass =
    variant === "desktop"
      ? "font-sans text-sm text-charcoal/75 transition-colors hover:text-gold"
      : "block py-1 font-sans text-base text-navy-deep hover:text-gold";
  const signOutButtonClass =
    variant === "desktop"
      ? "font-sans text-sm text-charcoal/50 transition-colors hover:text-gold"
      : "py-1 font-sans text-base text-charcoal/60 hover:text-gold";

  // Unknown yet (first client paint, before getUser() resolves): render
  // nothing rather than guessing, to avoid a visible flash from the
  // wrong guess in the common case (already signed in).
  if (signedIn === null) {
    return <span className="inline-block h-5 w-16" aria-hidden />;
  }

  if (!signedIn) {
    return (
      <Link href="/sign-in" className={linkClass}>
        Sign In
      </Link>
    );
  }

  const accountLink = (
    <Link href="/orders" className={linkClass}>
      My Orders
    </Link>
  );
  const signOutButton = (
    <form action={signOut}>
      <button type="submit" className={signOutButtonClass}>
        Sign Out
      </button>
    </form>
  );

  if (variant === "mobile") {
    return (
      <>
        {accountLink}
        {signOutButton}
      </>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {accountLink}
      {signOutButton}
    </div>
  );
}
