import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { DriverMessageThread } from "@/components/dispatch/DriverMessageThread";
import { requireDriver } from "@/lib/auth/roles";
import { listDriverMessages, markDriverMessagesRead } from "@/lib/actions/driver-messages";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Driver side of the messaging thread added 2026-09-24 (panel redesign
 * round 2) — this app had no inbox/message concept at all for a driver
 * before this (see DriverSidebar.tsx's own comment). Marks the staff
 * side of the thread read on every view, same as the customer bell's
 * markAllNotificationsRead — no separate "mark read" click needed.
 */
export default async function DriverInboxPage() {
  const driver = await requireDriver();
  const messages = await listDriverMessages(driver.id);
  const unreadCount = messages.filter((m) => m.authorType === "staff" && !m.readAt).length;
  await markDriverMessagesRead(driver.id);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="DRIVER"
        title="Inbox"
        description={unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}` : "Messages from City2Ranch."}
      />
      <Card>
        <DriverMessageThread driverId={driver.id} messages={messages} viewerRole="driver" />
      </Card>
    </div>
  );
}
