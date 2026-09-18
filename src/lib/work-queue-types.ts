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
  | "awaiting_driver_response"
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

// The true, real bucket enumeration — kept exactly as-is (labels
// included) since operations-dashboard.test.ts asserts its length and
// nothing about the panel redesign below needs it to change. BOARD_TABS
// below is the UI-facing presentation of the same data, a separate
// concept on purpose: one bucket (needs_quote) reads as two different
// things to staff depending on whether it's a raw lead or an
// already-converted order, and "All" isn't a real bucket at all.
export const WORK_QUEUE_TABS: { key: WorkQueueBucket; label: string }[] = [
  { key: "needs_quote", label: "Needs Quote" },
  { key: "awaiting_customer", label: "Awaiting Customer" },
  { key: "needs_payment", label: "Needs Payment" },
  { key: "ready_to_dispatch", label: "Ready to Dispatch" },
  { key: "awaiting_driver_response", label: "Awaiting Driver Response" },
  { key: "in_progress", label: "In Progress" },
  { key: "exceptions", label: "Exceptions" },
  { key: "completed", label: "Completed" },
];

/**
 * The Orders board's own tab bar (2026-09-18, panel redesign) — plain
 * nouns matching what the Operations dashboard's own PIPELINE_TILES
 * already display (dispatch/page.tsx), closing a real mismatch: those
 * tiles already split needs_quote into "New Leads"/"Pending Quotes" by
 * kind and already read "Awaiting Payment"/"Processing Payment"/
 * "Awaiting Driver", but clicking through used to land on a tab bar
 * still showing the raw bucket names, and New Leads/Pending Quotes
 * both pointed at the same single tab. `match()` replaces a plain
 * bucket `===` check so a bucket can split (or, for "all", not filter
 * at all) without needing a new WorkQueueBucket value.
 */
export type BoardTabKey =
  | "all"
  | "new_leads"
  | "pending_quotes"
  | "awaiting_customer"
  | "needs_payment"
  | "ready_to_dispatch"
  | "awaiting_driver_response"
  | "in_progress"
  | "exceptions"
  | "completed";

export const BOARD_TABS: { key: BoardTabKey; label: string; match: (item: WorkQueueItem) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "new_leads", label: "New Leads", match: (i) => i.bucket === "needs_quote" && i.kind === "request" },
  { key: "pending_quotes", label: "Pending Quotes", match: (i) => i.bucket === "needs_quote" && i.kind === "order" },
  { key: "awaiting_customer", label: "Awaiting Payment", match: (i) => i.bucket === "awaiting_customer" },
  { key: "needs_payment", label: "Processing Payment", match: (i) => i.bucket === "needs_payment" },
  { key: "ready_to_dispatch", label: "Ready To Dispatch", match: (i) => i.bucket === "ready_to_dispatch" },
  {
    key: "awaiting_driver_response",
    label: "Awaiting Driver",
    match: (i) => i.bucket === "awaiting_driver_response",
  },
  { key: "in_progress", label: "In Progress", match: (i) => i.bucket === "in_progress" },
  { key: "exceptions", label: "Exceptions", match: (i) => i.bucket === "exceptions" },
  { key: "completed", label: "Completed", match: (i) => i.bucket === "completed" },
];
