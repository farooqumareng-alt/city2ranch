import { PanelSidebar } from "@/components/layout/PanelSidebar";

const STAFF_LINKS = [{ href: "/internal/dispatch", label: "Dispatch Queue" }];

/** Same pattern as AccountSidebar/DriverSidebar — one item today, but
 *  a real nav shell rather than a one-off, since staff tooling is the
 *  most likely of the three to grow more pages next. */
export function StaffSidebar({ pathname }: { pathname: string }) {
  return <PanelSidebar links={STAFF_LINKS} pathname={pathname} />;
}
