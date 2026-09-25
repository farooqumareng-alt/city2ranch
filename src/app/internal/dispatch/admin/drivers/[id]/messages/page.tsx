import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { DriverMessageThread } from "@/components/dispatch/DriverMessageThread";
import { requireStaff } from "@/lib/auth/roles";
import { getDriverDetail } from "@/lib/actions/team-management";
import { listDriverMessages } from "@/lib/actions/driver-messages";

export const metadata: Metadata = { title: "Message Driver" };

/**
 * Staff side of the driver messaging thread (2026-09-24, panel redesign
 * round 2) — the Drivers table's own "Message" action. requireStaff(),
 * not requireSuperAdmin(): matches getDriverDetail()'s own 2026-09-18
 * widening and the Drivers lookup page it's linked from, both any-staff.
 */
export default async function DriverMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const detail = await getDriverDetail(id);
  if (!detail) notFound();

  const messages = await listDriverMessages(id);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="STAFF" title={`Message ${detail.driver.name}`} description={detail.driver.phone ?? "No phone on file"} />
      <Card>
        <DriverMessageThread driverId={id} messages={messages} viewerRole="staff" />
      </Card>
    </div>
  );
}
