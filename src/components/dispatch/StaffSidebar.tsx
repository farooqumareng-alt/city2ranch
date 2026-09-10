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
const STAFF_LINKS = [
  // exact: true — /internal/dispatch is now the Operations Center home,
  // and a plain prefix match would otherwise also light this up on
  // every sibling below it (queue, stores, settings all share this
  // same URL prefix). See PanelSidebar.tsx's PanelLink.exact doc.
  { href: "/internal/dispatch", label: "Overview", exact: true },
  { href: "/internal/dispatch/queue", label: "Work Queue", group: "Operations" },
  // Operations-data screens (Step 7) — real CRUD for tables that used to
  // be SQL/seed-file-only. Staff-level, not super-admin-only, matching
  // RLS's own "any active staff" gate on all four tables.
  { href: "/internal/dispatch/stores", label: "Stores", group: "Business" },
  { href: "/internal/dispatch/pricing", label: "Pricing", group: "Business" },
  { href: "/internal/dispatch/zip-coverage", label: "ZIP Coverage", group: "Business" },
  { href: "/internal/dispatch/grocery-items", label: "Grocery Items", group: "Business" },
];

// Only shown to a super_admin — display-only convenience, not the
// enforcement boundary. requireSuperAdmin() on each of these pages is
// what actually blocks a plain staff member who guesses the URL.
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

// Settings stays last regardless of role — spliced in after the
// role-dependent groups above rather than living at the end of
// STAFF_LINKS, so a super_admin sees Operations -> Business -> People
// -> Settings (matching the directive's own trailing-Settings order),
// not People appearing after it.
const SETTINGS_LINK = { href: "/internal/dispatch/settings", label: "Settings" };

/** Same pattern as AccountSidebar/DriverSidebar. */
export function StaffSidebar({
  userEmail,
  isSuperAdmin,
}: {
  userEmail?: string;
  isSuperAdmin?: boolean;
}) {
  const links = isSuperAdmin
    ? [...STAFF_LINKS, ...ADMIN_LINKS, SETTINGS_LINK]
    : [...STAFF_LINKS, SETTINGS_LINK];
  return <PanelSidebar links={links} userEmail={userEmail} accountType="Staff" />;
}
