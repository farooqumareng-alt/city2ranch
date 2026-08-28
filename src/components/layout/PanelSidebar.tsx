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
  userEmail,
  managingEmail,
}: {
  links: PanelLink[];
  pathname: string;
  /** Shown above the links so it's never ambiguous which of several
   *  accounts (e.g. a staff member who is also a driver) is currently
   *  signed in — this is display-only, not a role indicator. */
  userEmail?: string;
  /** Set when the signed-in user is a household member (see
   *  src/lib/household.ts) operating another account by full
   *  delegation — makes it unmistakable whose orders/places/payments
   *  are actually being shown, since they aren't the signed-in
   *  person's own. */
  managingEmail?: string;
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
      {userEmail ? (
        <div className="mb-1 hidden flex-col gap-0.5 border-b border-navy/10 pb-3 md:flex">
          <span className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
            Signed in as
          </span>
          <span className="truncate font-sans text-sm font-medium text-navy-deep" title={userEmail}>
            {userEmail}
          </span>
          {managingEmail ? (
            <span className="mt-1 truncate font-sans text-xs text-gold" title={managingEmail}>
              Managing {managingEmail}&apos;s account
            </span>
          ) : null}
        </div>
      ) : null}
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
