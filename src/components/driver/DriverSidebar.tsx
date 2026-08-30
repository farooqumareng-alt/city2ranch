import { PanelSidebar } from "@/components/layout/PanelSidebar";

const DRIVER_LINKS = [{ href: "/internal/driver", label: "My Deliveries" }];

export function DriverSidebar({
  userEmail,
  userName,
}: {
  userEmail?: string;
  userName?: string;
}) {
  return (
    <PanelSidebar
      links={DRIVER_LINKS}
      userEmail={userEmail}
      userName={userName}
      accountType="Driver"
      // Same reasoning as StaffSidebar's crossPanelLink — every signed-in
      // person already has a normal account at /home, driver or not.
      crossPanelLink={{ href: "/home", label: "My Account" }}
    />
  );
}
