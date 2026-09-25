import { MessageThread } from "@/components/MessageThread";
import { postDriverMessage } from "@/lib/actions/driver-messages";

type Message = {
  id: string;
  createdAt: Date;
  authorType: string;
  body: string;
};

const AUTHOR_LABELS: Record<string, string> = {
  staff: "City2Ranch",
  driver: "Driver",
};

/**
 * Driver-scoped counterpart to OrderMessageThread.tsx — same
 * MessageThread.tsx underneath, shared by the staff-side thread page
 * (/internal/dispatch/admin/drivers/[id]/messages) and the driver's own
 * Inbox tab (/internal/driver/inbox).
 */
export function DriverMessageThread({
  driverId,
  messages,
  viewerRole,
}: {
  driverId: string;
  messages: Message[];
  viewerRole: "staff" | "driver";
}) {
  return (
    <MessageThread
      messages={messages}
      viewerRole={viewerRole}
      labelForAuthorType={(authorType) => AUTHOR_LABELS[authorType] ?? authorType}
      postAction={postDriverMessage.bind(null, driverId)}
    />
  );
}
