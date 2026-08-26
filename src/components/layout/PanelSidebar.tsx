import Link from "next/link";
import { signOut } from "@/lib/actions/sign-out";

export type PanelLink = { href: string; label: string };

/**
 * Shared sidebar shell for every signed-in panel — the customer account
 * area (/orders, /profile), staff dispatch (/internal/dispatch), and
 * the driver view (/internal/driver). Each panel's layout.tsx passes
 * its own `links`; this owns the shared shape (active-link highlight,
 * responsive row-on-mobile/column-on-desktop, Sign Out) so the three
 * panels don't drift into three slightly different sidebars over time.
 *
 * Server component: links are static per-panel and signOut is already
 * a server action, so no client state is needed here (unlike the
 * top-nav "My Account" dropdown, which needs open/close state).
 */
export function PanelSidebar({
  links,
  pathname,
}: {
  links: PanelLink[];
  pathname: string;
}) {
  const linkBase =
    "whitespace-nowrap rounded-sm px-3 py-2 font-sans text-sm transition-colors hover:bg-white hover:text-gold";
  const activeClass = "bg-white font-medium text-navy-deep";
  const inactiveClass = "text-charcoal/70";

  return (
    <nav
      aria-label="Panel"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-navy/10 pb-3 md:w-48 md:flex-col md:gap-1 md:border-b-0 md:border-r md:border-navy/10 md:pb-0 md:pr-6"
    >
      {links.map((link) => {
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
