import { PanelSidebar } from "@/components/layout/PanelSidebar";

// Grouped 2026-09-09 (Priority 7 of the master implementation
// directive, "simplify navigation... group existing functionality
// into understandable areas") — this flat list had grown to 9 links
// spanning three genuinely different concerns (day-to-day dispatch
// work, configuring business rules, managing people). Group labels
// match the directive's own Super Admin outline as closely as real
// routes allow; the link label itself stays "ZIP Coverage", not the
// directive's "Service Areas" — that page's own title/heading already
// says "ZIP Coverage" everywhere, and a link reading "Service Areas"
// landing on a page that says something else would be a new
// inconsistency, not a fix for one. "Payments" isn't included as its
// own group — it doesn't exist as a top-level page. Drivers/Customers
// DO now (2026-09-18, any-staff read-only lookup pages — see
// DriversLookupList.tsx/CustomersLookupList.tsx's own comments), which
// is what the original redesign actually asked for; the detail pages
// they link to (and Team's own driver management) stay
// super_admin-only, unaffected — see ADMIN_LINKS' own comment below.
//
// exact: true — /internal/dispatch is now the Orders home (formerly
// "Overview", separate from Work Queue — the two merged into one
// screen 2026-09-16, business-first navigation redesign), and a plain
// prefix match would otherwise also light this up on every sibling
// below it (stores, settings all share this same URL prefix). See
// PanelSidebar.tsx's PanelLink.exact doc.
const STAFF_LINKS = [
  { href: "/internal/dispatch", label: "Orders", exact: true },
  // The guest-facing pipeline upstream of Orders (waitlist/founding-
  // member/contact signups) had no admin view at all before this; see
  // listInboxEntries()'s own doc comment.
  { href: "/internal/dispatch/inbox", label: "Inbox", group: "Operations" },
  { href: "/internal/dispatch/drivers", label: "Drivers", group: "Operations" },
  { href: "/internal/dispatch/customers", label: "Customers", group: "Operations" },
];

// Manager-or-above only (2026-09-11, requireManager() — see that
// function's own doc comment in src/lib/auth/roles.ts) — plain staff no
// longer sees these at all, matching the real gate on each page, not
// just hidden-but-reachable. Settings moved out of this group
// (2026-09-16, business-first navigation redesign) to super_admin-only
// — see SETTINGS_LINK below; day-to-day business tuning (pricing,
// stores) stays Manager+, but system-level settings is Super Admin
// only now, matching that redesign's explicit ask.
const BUSINESS_LINKS = [
  { href: "/internal/dispatch/stores", label: "Stores", group: "Business" },
  { href: "/internal/dispatch/pricing", label: "Pricing", group: "Business" },
  { href: "/internal/dispatch/zip-coverage", label: "ZIP Coverage", group: "Business" },
  { href: "/internal/dispatch/grocery-items", label: "Grocery Items", group: "Business" },
];

// Only shown to a super_admin — display-only convenience, not the
// enforcement boundary. requireSuperAdmin() on each of these pages is
// what actually blocks anyone else who guesses the URL.
// Two links, not one flat "Admin" — Business Overview (business health)
// and Team (staff/driver account management — adding drivers, toggling
// active, role changes) answer different questions from the plain-staff
// Drivers/Customers lookup pages above (approved UX blueprint, Phase
// 5's People/Business split). Grouped under "People" to match the
// directive's own outline, even though it's only two links today.
const ADMIN_LINKS = [
  // exact: true for the same reason Overview above has it — /admin is a
  // parent path of /admin/team.
  { href: "/internal/dispatch/admin", label: "Business Overview", exact: true, group: "People" },
  { href: "/internal/dispatch/admin/team", label: "Team", group: "People" },
  // Self-service admin blog (2026-09-09) — its own group, not folded
  // into People/Business: publishing to the public site is a different
  // kind of action from either managing staff or configuring pricing
  // data, and "Content" names that directly.
  { href: "/internal/dispatch/admin/blog", label: "Blog", group: "Content" },
];

// Super_admin only, ungrouped and trailing (2026-09-16) — same
// reasoning as the master implementation directive's original
// Priority 8 rule this echoes: system-level configuration is a
// different trust boundary from Business's day-to-day pricing/stores
// tuning, which a Manager can still reach on their own.
const SETTINGS_LINK = { href: "/internal/dispatch/settings", label: "Settings" };

/** Same pattern as AccountSidebar/DriverSidebar. */
export function StaffSidebar({
  userEmail,
  isSuperAdmin,
  canConfigureBusiness,
}: {
  userEmail?: string;
  isSuperAdmin?: boolean;
  /** canPerform(staffMember.role, "configure_business") — manager or
   *  super_admin. Plain staff sees only Orders/Inbox. */
  canConfigureBusiness?: boolean;
}) {
  const links = [
    ...STAFF_LINKS,
    ...(canConfigureBusiness ? BUSINESS_LINKS : []),
    ...(isSuperAdmin ? [...ADMIN_LINKS, SETTINGS_LINK] : []),
  ];
  return <PanelSidebar links={links} userEmail={userEmail} accountType="Staff" />;
}
