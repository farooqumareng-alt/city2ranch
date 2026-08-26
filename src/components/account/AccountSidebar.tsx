import Link from "next/link";
import { signOut } from "@/lib/actions/sign-out";

const ACCOUNT_LINKS = [
  { href: "/orders", label: "My Orders" },
  { href: "/profile", label: "Profile" },
];

/**
 * Replaces the top nav's "My Account" dropdown on signed-in account
 * pages (/orders/*, /profile) — NavAuthControl hides that dropdown on
 * these routes specifically so there's one account-nav surface, not
 * two competing ones. Server component: the links are static and
 * signOut is already a server action, so no client state is needed
 * here (unlike the top-nav dropdown, which needs open/close state).
 *
 * Row on mobile, column on desktop — a persistent sidebar doesn't fit
 * a narrow viewport, so it collapses to a horizontal strip above the
 * page content instead of a slide-out drawer, matching how little
 * else in this app relies on client-side mobile chrome.
 */
export function AccountSidebar({ pathname }: { pathname: string }) {
  const linkBase =
    "whitespace-nowrap rounded-sm px-3 py-2 font-sans text-sm transition-colors hover:bg-white hover:text-gold";
  const activeClass = "bg-white font-medium text-navy-deep";
  const inactiveClass = "text-charcoal/70";

  return (
    <nav
      aria-label="Account"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-navy/10 pb-3 md:w-48 md:flex-col md:gap-1 md:border-b-0 md:border-r md:border-navy/10 md:pb-0 md:pr-6"
    >
      {ACCOUNT_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`${linkBase} ${active ? activeClass : inactiveClass}`}
          >
            {link.label}
          </Link>
        );
      })}
      <form action={signOut}>
        <button
          type="submit"
          className={`${linkBase} ${inactiveClass} w-full text-left md:w-auto`}
        >
          Sign Out
        </button>
      </form>
    </nav>
  );
}
