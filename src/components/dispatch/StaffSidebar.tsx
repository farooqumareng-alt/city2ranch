import { PanelSidebar } from "@/components/layout/PanelSidebar";

const STAFF_LINKS = [
  { href: "/internal/dispatch", label: "Dispatch Queue" },
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
  return <PanelSidebar links={links} userEmail={userEmail} accountType="Staff" />;
}
