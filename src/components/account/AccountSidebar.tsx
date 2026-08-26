import { PanelSidebar } from "@/components/layout/PanelSidebar";

const ACCOUNT_LINKS = [
  { href: "/orders", label: "My Orders" },
  { href: "/profile", label: "Profile" },
];

/**
 * Replaces the top nav's "My Account" dropdown on signed-in account
 * pages (/orders/*, /profile) — NavAuthControl hides that dropdown on
 * these routes specifically so there's one account-nav surface, not
 * two competing ones.
 */
export function AccountSidebar({ pathname }: { pathname: string }) {
  return <PanelSidebar links={ACCOUNT_LINKS} pathname={pathname} />;
}
