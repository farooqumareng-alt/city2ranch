"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/sign-out";

export type PanelLink = {
  href: string;
  label: string;
  /** Match only pathname === href, never a prefix — needed for a link
   *  whose href is itself a *parent* path of sibling routes (e.g.
   *  "/internal/dispatch" once /internal/dispatch/queue exists alongside
   *  it), where the default prefix match would make it show active on
   *  every one of those siblings too. Leave unset for every ordinary
   *  link — this only matters when a link's own href is a strict prefix
   *  of another link's href on the same panel. */
  exact?: boolean;
};

/**
 * Shared sidebar shell for every signed-in panel — the customer account
 * area (/orders, /profile), staff dispatch (/internal/dispatch), and
 * the driver view (/internal/driver). Each panel's layout.tsx passes
 * its own `links`; this owns the shared shape (active-link highlight,
 * responsive row-on-mobile/column-on-desktop, Sign Out) so the three
 * panels don't drift into three slightly different sidebars over time.
 *
 * Client component specifically so the active-link highlight can use
 * usePathname() — this used to take `pathname` as a prop computed
 * server-side (from the x-pathname header each layout set), but a
 * shared layout like (account)/layout.tsx is kept across client-side
 * navigations to a sibling page (see Next's "client-side transitions"
 * docs) rather than re-rendered on every click, so that server-computed
 * pathname went stale — the highlight would lag one navigation behind
 * whatever page was actually showing. usePathname() reads the client
 * router's live state instead, so it's always correct immediately,
 * with no extra round trip.
 */
export function PanelSidebar({
  links,
  userEmail,
  userName,
  accountType,
  managingEmail,
  managingRole,
  crossPanelLink,
}: {
  links: PanelLink[];
  /** Shown above the links so it's never ambiguous which of several
   *  accounts (e.g. a staff member who is also a driver) is currently
   *  signed in — this is display-only, not a role indicator. */
  userEmail?: string;
  /** A real display name (customer profile name, driver name) when one
   *  exists — shown as the primary line instead of the email, which is
   *  demoted to a smaller secondary line. Falls back to email-only when
   *  there's no name on file (e.g. staff, who have no name field). */
  userName?: string;
  /** Which panel this is — "Customer" / "Staff" / "Driver" — since the
   *  same email can hold more than one role (a staff member who's also
   *  a driver) and "Signed in as" alone doesn't say which hat they're
   *  wearing right now. */
  accountType?: string;
  /** Set when the signed-in user is a household member (see
   *  src/lib/household.ts) operating another account by delegation —
   *  makes it unmistakable whose orders/places/payments are actually
   *  being shown, since they aren't the signed-in person's own. */
  managingEmail?: string;
  /** Set alongside managingEmail when the delegated member's role is
   *  something less than full access (e.g. "ordering", "view_only") —
   *  omitted for full access, since that was the only option before
   *  roles existed and stays the unlabeled default. */
  managingRole?: string;
  /** A way into a *different* panel the same signed-in person also has
   *  access to (e.g. a customer who's also staff, jumping to
   *  /internal/dispatch) — rendered distinctly from `links` (which are
   *  all destinations within this one panel) with its own visual
   *  separation, and visible at every breakpoint, unlike the "Signed in
   *  as" identity block above which is desktop-only. */
  crossPanelLink?: PanelLink;
}) {
  const pathname = usePathname();
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
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
              Signed in as
            </span>
            {accountType ? (
              <span className="rounded-full bg-navy/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-navy-deep">
                {accountType}
              </span>
            ) : null}
          </div>
          <span className="truncate font-sans text-sm font-medium text-navy-deep" title={userName ?? userEmail}>
            {userName ?? userEmail}
          </span>
          {userName ? (
            <span className="truncate font-sans text-xs text-charcoal/50" title={userEmail}>
              {userEmail}
            </span>
          ) : null}
          {managingEmail ? (
            <span className="mt-1 truncate font-sans text-xs text-gold" title={managingEmail}>
              Managing {managingEmail}&apos;s account
              {managingRole ? ` (${managingRole.replace("_", " ")})` : ""}
            </span>
          ) : null}
        </div>
      ) : null}
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
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
      {crossPanelLink ? (
        <Link
          href={crossPanelLink.href}
          className={`${linkBase} mt-1 border-t border-navy/10 pt-3 font-medium text-gold hover:bg-transparent md:mt-1 md:border-t md:pt-3`}
        >
          {crossPanelLink.label} →
        </Link>
      ) : null}
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
