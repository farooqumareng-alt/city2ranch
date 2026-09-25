import { PanelSidebar } from "@/components/layout/PanelSidebar";

const DRIVER_LINKS = [
  // exact: true — /internal/driver/history is a sibling route, not a
  // child of Today's Jobs, and without this a plain prefix match would
  // light up both links at once while viewing History. Same reasoning
  // as StaffSidebar's Dashboard link.
  { href: "/internal/driver", label: "Today's Jobs", exact: true },
  { href: "/internal/driver/history", label: "History" },
  // Added 2026-09-24 (panel redesign round 2) alongside driver_messages —
  // no unread-count badge here (PanelSidebar's PanelLink has no such
  // concept, shared as-is across all three panels); the Inbox page's own
  // heading shows the unread count instead.
  { href: "/internal/driver/inbox", label: "Inbox" },
];

export function DriverSidebar({
  userEmail,
  userName,
}: {
  userEmail?: string;
  userName?: string;
}) {
  return <PanelSidebar links={DRIVER_LINKS} userEmail={userEmail} userName={userName} accountType="Driver" />;
}
