import { PanelSidebar } from "@/components/layout/PanelSidebar";

const DRIVER_LINKS = [{ href: "/internal/driver", label: "My Deliveries" }];

export function DriverSidebar({ pathname }: { pathname: string }) {
  return <PanelSidebar links={DRIVER_LINKS} pathname={pathname} />;
}
