import { PanelSidebar } from "@/components/layout/PanelSidebar";

// Approved UX blueprint (Navigation map, Decision 2): My Requests, My
// Deliveries, and My Orders were three pages built from the same
// underlying orders/service_requests data — collapsed into one "My
// Services" destination rather than three, matching how a customer
// actually thinks about it ("where is everything I've asked for").
// Places/Lists stay separate items rather than merging further — they're
// reference data a customer sets up once, not a lifecycle stage.
const ACCOUNT_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/my-services", label: "My Services" },
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
