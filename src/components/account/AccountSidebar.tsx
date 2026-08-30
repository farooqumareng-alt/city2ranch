import { PanelSidebar } from "@/components/layout/PanelSidebar";

// Ordered by how often a customer actually needs it, not alphabetically
// — Home first (the real landing point, not a specific function), then
// Requests -> Deliveries -> Orders following the real lifecycle
// (Customer -> Request -> Delivery -> Payment), then the supporting
// account areas. No separate "Services" entry: Home's own "Request
// Service" action already covers that, and a second link to the public
// marketing page just left the account panel entirely — a duplicate
// path to the same place, not a distinct destination.
const ACCOUNT_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/requests", label: "My Requests" },
  { href: "/deliveries", label: "My Deliveries" },
  { href: "/orders", label: "My Orders" },
  { href: "/lists", label: "My Lists" },
  { href: "/places", label: "My Places" },
  { href: "/recurring-services", label: "Recurring Services" },
  { href: "/household", label: "Household" },
  { href: "/membership", label: "Membership" },
  { href: "/payments", label: "Payments" },
  { href: "/notifications", label: "Notifications" },
  { href: "/support", label: "Support" },
  { href: "/profile", label: "Profile" },
];

/**
 * Replaces the top nav's "My Account" dropdown on signed-in account
 * pages (/orders/*, /profile) — NavAuthControl hides that dropdown on
 * these routes specifically so there's one account-nav surface, not
 * two competing ones.
 */
export function AccountSidebar({
  userEmail,
  userName,
  managingEmail,
  managingRole,
  isStaff,
}: {
  userEmail?: string;
  userName?: string;
  managingEmail?: string;
  managingRole?: string;
  /** True when the signed-in person also has an active row in `staff`
   *  (see src/lib/auth/roles.ts's isActiveStaffMember) — there's no
   *  separate "staff signup," so someone can hold a normal customer
   *  account and staff access on the same identity with nothing here
   *  otherwise indicating it. Surfaces a way into /internal/dispatch
   *  that isn't "already know the URL." */
  isStaff?: boolean;
}) {
  return (
    <PanelSidebar
      links={ACCOUNT_LINKS}
      userEmail={userEmail}
      userName={userName}
      accountType="Customer"
      managingEmail={managingEmail}
      managingRole={managingRole}
      crossPanelLink={isStaff ? { href: "/internal/dispatch", label: "Staff Dashboard" } : undefined}
    />
  );
}
