import { PanelSidebar } from "@/components/layout/PanelSidebar";

const ACCOUNT_LINKS = [
  { href: "/requests", label: "My Requests" },
  { href: "/orders", label: "My Orders" },
  { href: "/places", label: "My Places" },
  { href: "/lists", label: "My Lists" },
  { href: "/household", label: "Household" },
  { href: "/membership", label: "Membership" },
  { href: "/profile", label: "Profile" },
  { href: "/support", label: "Support" },
];

/**
 * Replaces the top nav's "My Account" dropdown on signed-in account
 * pages (/orders/*, /profile) — NavAuthControl hides that dropdown on
 * these routes specifically so there's one account-nav surface, not
 * two competing ones.
 */
export function AccountSidebar({
  pathname,
  userEmail,
  managingEmail,
}: {
  pathname: string;
  userEmail?: string;
  managingEmail?: string;
}) {
  return (
    <PanelSidebar links={ACCOUNT_LINKS} pathname={pathname} userEmail={userEmail} managingEmail={managingEmail} />
  );
}
