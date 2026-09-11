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
// inconsistency, not a fix for one. "Customers"/"Orders"/"Payments"
// aren't included as their own group — none of those exist as
// top-level pages yet (Customers/Drivers are link-through-only,
// reached from a Work Queue row or Team's own list — see ADMIN_LINKS'
// own comment below), and the directive is explicit that this pass
// reuses existing routes rather than creating new ones.
//
// exact: true — /internal/dispatch is now the Operations Center home,
// and a plain prefix match would otherwise also light this up on every
// sibling below it (queue, stores, settings all share this same URL
// prefix). See PanelSidebar.tsx's PanelLink.exact doc.
const STAFF_LINKS = [
  { href: "/internal/dispatch", label: "Overview", exact: true },
  { href: "/internal/dispatch/queue", label: "Work Queue", group: "Operations" },
];

// Manager-or-above only (2026-09-11, requireManager() — see that
// function's own doc comment in src/lib/auth/roles.ts) — plain staff no
// longer sees these at all, matching the real gate on each page, not
// just hidden-but-reachable. Settings lives here too now, not appended
// separately — same "configure_business" capability gates both.
const BUSINESS_LINKS = [
  { href: "/internal/dispatch/stores", label: "Stores", group: "Business" },
  { href: "/internal/dispatch/pricing", label: "Pricing", group: "Business" },
  { href: "/internal/dispatch/zip-coverage", label: "ZIP Coverage", group: "Business" },
  { href: "/internal/dispatch/grocery-items", label: "Grocery Items", group: "Business" },
  { href: "/internal/dispatch/settings", label: "Settings" },
];

// Only shown to a super_admin — display-only convenience, not the
// enforcement boundary. requireSuperAdmin() on each of these pages is
// what actually blocks anyone else who guesses the URL.
// Two links, not one flat "Admin" — Business Overview (business health)
// and Team (staff/driver account management) answer different
// questions (approved UX blueprint, Phase 5's People/Business split);
// Customers and Drivers detail pages stay link-through-only for now
// (reached from a Work Queue row or Team's own driver list), not
// promoted to their own nav entries until a real list/search view
// exists for them. Grouped under "People" to match the directive's own
// outline, even though it's only two links today.
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

/** Same pattern as AccountSidebar/DriverSidebar. */
export function StaffSidebar({
  userEmail,
  isSuperAdmin,
  canConfigureBusiness,
}: {
  userEmail?: string;
  isSuperAdmin?: boolean;
  /** canPerform(staffMember.role, "configure_business") — manager or
   *  super_admin. Plain staff sees only Overview/Work Queue. */
  canConfigureBusiness?: boolean;
}) {
  const links = [
    ...STAFF_LINKS,
    ...(canConfigureBusiness ? BUSINESS_LINKS : []),
    ...(isSuperAdmin ? ADMIN_LINKS : []),
  ];
  return <PanelSidebar links={links} userEmail={userEmail} accountType="Staff" />;
}
