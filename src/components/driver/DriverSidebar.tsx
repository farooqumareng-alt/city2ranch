import { PanelSidebar } from "@/components/layout/PanelSidebar";

const DRIVER_LINKS = [{ href: "/internal/driver", label: "My Deliveries" }];

export function DriverSidebar({
  pathname,
  userEmail,
  userName,
}: {
  pathname: string;
  userEmail?: string;
  userName?: string;
}) {
  return (
    <PanelSidebar
      links={DRIVER_LINKS}
      pathname={pathname}
      userEmail={userEmail}
      userName={userName}
      accountType="Driver"
    />
  );
}
