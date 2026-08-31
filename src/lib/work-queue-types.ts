import type { OrderStatus } from "@/lib/orders/status";

/**
 * Split out of work-queue.ts specifically so WorkQueueBoard.tsx (a
 * client component) can import the bucket/item types and the tab list
 * without also pulling in getWorkQueue()'s getDb() import — that chain
 * drags in `postgres`, which needs Node's net/tls/perf_hooks and fails
 * the client bundle outright. Same DB-free-module reasoning as
 * src/lib/orders/status.ts.
 */
export type WorkQueueBucket =
  | "needs_quote"
  | "awaiting_customer"
  | "needs_payment"
  | "ready_to_dispatch"
  | "in_progress"
  | "exceptions"
  | "completed";

export type WorkQueueItem = {
  id: string;
  kind: "request" | "order";
  bucket: WorkQueueBucket;
  status: OrderStatus | null;
  serviceType: "pickup" | "concierge" | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  authUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalCents: number | null;
  storeName: string | null;
  driverName: string | null;
  retailerOrderNumber: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryZip: string | null;
  requestedDeliveryDate: string | null;
  referralSource: string | null;
  href: string;
};

export const WORK_QUEUE_TABS: { key: WorkQueueBucket; label: string }[] = [
  { key: "needs_quote", label: "Needs Quote" },
  { key: "awaiting_customer", label: "Awaiting Customer" },
  { key: "needs_payment", label: "Needs Payment" },
  { key: "ready_to_dispatch", label: "Ready to Dispatch" },
  { key: "in_progress", label: "In Progress" },
  { key: "exceptions", label: "Exceptions" },
  { key: "completed", label: "Completed" },
];
