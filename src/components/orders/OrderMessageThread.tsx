import { MessageThread } from "@/components/MessageThread";
import { postOrderMessage } from "@/lib/actions/order-messages";

type Message = {
  id: string;
  createdAt: Date;
  authorType: string;
  body: string;
};

const AUTHOR_LABELS: Record<string, string> = {
  staff: "City2Ranch Concierge",
  customer: "Customer",
};

/**
 * Shared by the customer order-detail page and the staff concierge
 * quote page — same thread, same data, the only difference is which
 * side "You" refers to. Thin wrapper over MessageThread.tsx (2026-09-24
 * panel redesign round 2) — the actual list+form markup now lives there,
 * shared with the new driver-side DriverMessageThread.tsx.
 */
export function OrderMessageThread({
  orderId,
  messages,
  viewerRole,
}: {
  orderId: string;
  messages: Message[];
  viewerRole: "customer" | "staff";
}) {
  return (
    <MessageThread
      messages={messages}
      viewerRole={viewerRole}
      labelForAuthorType={(authorType) => AUTHOR_LABELS[authorType] ?? authorType}
      postAction={postOrderMessage.bind(null, orderId)}
    />
  );
}
