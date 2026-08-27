import { PanelSidebar } from "@/components/layout/PanelSidebar";

const STAFF_LINKS = [
  { href: "/internal/dispatch", label: "Dispatch Queue" },
  { href: "/internal/dispatch/concierge", label: "Concierge Quotes" },
];

/** Same pattern as AccountSidebar/DriverSidebar. */
export function StaffSidebar({ pathname, userEmail }: { pathname: string; userEmail?: string }) {
  return <PanelSidebar links={STAFF_LINKS} pathname={pathname} userEmail={userEmail} />;
}
