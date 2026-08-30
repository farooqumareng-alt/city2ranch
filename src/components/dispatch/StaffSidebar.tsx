import { PanelSidebar } from "@/components/layout/PanelSidebar";

const STAFF_LINKS = [
  // exact: true — /internal/dispatch is now the Operations Center home,
  // and a plain prefix match would otherwise also light this up on
  // every sibling below it (queue, concierge, settings all share this
  // same URL prefix). See PanelSidebar.tsx's PanelLink.exact doc.
  { href: "/internal/dispatch", label: "Dashboard", exact: true },
  { href: "/internal/dispatch/queue", label: "Dispatch Queue" },
  { href: "/internal/dispatch/concierge", label: "Concierge Quotes" },
  { href: "/internal/dispatch/settings", label: "Settings" },
];

// Only shown to a super_admin — display-only convenience, not the
// enforcement boundary. requireSuperAdmin() in the admin page itself is
// what actually blocks a plain staff member who guesses the URL.
const ADMIN_LINK = { href: "/internal/dispatch/admin", label: "Admin" };

/** Same pattern as AccountSidebar/DriverSidebar. */
export function StaffSidebar({
  userEmail,
  isSuperAdmin,
}: {
  userEmail?: string;
  isSuperAdmin?: boolean;
}) {
  const links = isSuperAdmin ? [...STAFF_LINKS, ADMIN_LINK] : STAFF_LINKS;
  return (
    <PanelSidebar
      links={links}
      userEmail={userEmail}
      accountType="Staff"
      // Unconditional, unlike AccountSidebar's isStaff check — there's
      // no separate "customer signup," every signed-in person already
      // has a normal account at /home, staff or not. Closes the loop
      // AccountSidebar's own "Staff Dashboard" link opened the other way.
      crossPanelLink={{ href: "/home", label: "My Account" }}
    />
  );
}
