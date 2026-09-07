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
];

/**
 * The account panel's own nav — Sign Out and "My Account"-style
 * cross-panel links live in the header now (NavAuthControl), not here;
 * see PanelSidebar.tsx's doc comment. A staff-also-customer identity
 * reaches /internal/dispatch automatically on their next plain
 * sign-in (see /auth/callback's defaultLandingFor) rather than via a
 * dedicated link from here — that discovery path moved, not away.
 *
 * Profile isn't listed here either (2026-09-07) — it moved into the
 * header's My Account dropdown alongside Sign Out, so it's reachable
 * from every page, not just while already inside this panel. Keeping
 * it here too would just be the same link twice on every account page.
 */
export function AccountSidebar({
  userEmail,
  userName,
  managingEmail,
  managingRole,
}: {
  userEmail?: string;
  userName?: string;
  managingEmail?: string;
  managingRole?: string;
}) {
  return (
    <PanelSidebar
      links={ACCOUNT_LINKS}
      userEmail={userEmail}
      userName={userName}
      accountType="Customer"
      managingEmail={managingEmail}
      managingRole={managingRole}
    />
  );
}
