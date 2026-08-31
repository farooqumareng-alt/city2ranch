import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, stores, drivers, serviceRequests } from "@/lib/db/schema";
import type { OrderStatus } from "@/lib/orders/status";
import type { WorkQueueBucket, WorkQueueItem } from "@/lib/work-queue-types";

export type { WorkQueueBucket, WorkQueueItem } from "@/lib/work-queue-types";
export { WORK_QUEUE_TABS } from "@/lib/work-queue-types";

/**
 * The unified staff Work Queue — approved blueprint §Screen inventory:
 * one working surface for every service, tabbed by what staff needs to
 * do next rather than split across the old /internal/dispatch/queue
 * (paid+) and /internal/dispatch/concierge (quote-stage) pages. No new
 * table: this merges service_requests + orders exactly like
 * src/lib/my-services.ts does for the customer side.
 *
 * Types/tabs live in work-queue-types.ts, not here — this module pulls
 * in getDb(), which a client component (WorkQueueBoard.tsx) must never
 * import even transitively. Re-exported above so every existing
 * `from "@/lib/work-queue"` import keeps working.
 */
function bucketForStatus(status: OrderStatus): WorkQueueBucket {
  switch (status) {
    case "quote_pending":
      return "needs_quote";
    case "priced":
      return "awaiting_customer";
    case "payment_pending":
      return "needs_payment";
    case "paid":
      return "ready_to_dispatch";
    case "driver_assigned":
    case "picked_up":
    case "in_transit":
      return "in_progress";
    case "failed":
      return "exceptions";
    case "completed":
    case "cancelled":
      return "completed";
  }
}

// The Completed tab is recent history, not a full archive — an
// unbounded "every order ever completed" query only ever grows, and
// nothing on this page needs more than a recent look-back.
const COMPLETED_LOOKBACK_LIMIT = 50;

export async function getWorkQueue(): Promise<WorkQueueItem[]> {
  const db = getDb();

  const [liveOrders, recentClosedOrders, unconvertedRequests] = await Promise.all([
    // Every order still in play — no limit, this is meant to be the
    // complete live working set. "failed" stays here (not archived)
    // since a fresh failure always needs to stay visible.
    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        authUserId: orders.authUserId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        totalCents: orders.totalCents,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        deliveryZip: orders.deliveryZip,
        requestedDeliveryDate: orders.requestedDeliveryDate,
        storeName: stores.name,
        driverName: drivers.name,
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .where(notInArray(orders.status, ["completed", "cancelled"])),

    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        authUserId: orders.authUserId,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        totalCents: orders.totalCents,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        deliveryZip: orders.deliveryZip,
        requestedDeliveryDate: orders.requestedDeliveryDate,
        storeName: stores.name,
        driverName: drivers.name,
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .where(inArray(orders.status, ["completed", "cancelled"]))
      .orderBy(desc(orders.updatedAt))
      .limit(COMPLETED_LOOKBACK_LIMIT),

    // Left-joined against orders exactly like getOwnServiceRequests —
    // only a request with no order yet belongs here; one that's already
    // converted is represented by its order instead, never both.
    db
      .select({
        id: serviceRequests.id,
        name: serviceRequests.name,
        email: serviceRequests.email,
        phone: serviceRequests.phone,
        createdAt: serviceRequests.createdAt,
        requestedDeliveryDate: serviceRequests.requestedDeliveryDate,
        referralSource: serviceRequests.referralSource,
        orderId: orders.id,
      })
      .from(serviceRequests)
      .leftJoin(orders, eq(orders.serviceRequestId, serviceRequests.id))
      .where(and(inArray(serviceRequests.status, ["new", "contacted"]), isNull(orders.id)))
      .orderBy(serviceRequests.createdAt),
  ]);

  const items: WorkQueueItem[] = [];

  for (const order of [...liveOrders, ...recentClosedOrders]) {
    items.push({
      id: order.id,
      kind: "order",
      bucket: bucketForStatus(order.status),
      status: order.status,
      serviceType: order.serviceType,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      authUserId: order.authUserId,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      totalCents: order.totalCents,
      storeName: order.storeName,
      driverName: order.driverName,
      retailerOrderNumber: order.retailerOrderNumber,
      deliveryCity: order.deliveryCity,
      deliveryState: order.deliveryState,
      deliveryZip: order.deliveryZip,
      requestedDeliveryDate: order.requestedDeliveryDate,
      referralSource: null,
      href: `/internal/dispatch/orders/${order.id}`,
    });
  }

  for (const request of unconvertedRequests) {
    items.push({
      id: request.id,
      kind: "request",
      bucket: "needs_quote",
      status: null,
      serviceType: "concierge",
      customerName: request.name,
      customerEmail: request.email,
      customerPhone: request.phone,
      authUserId: null,
      createdAt: new Date(request.createdAt),
      updatedAt: new Date(request.createdAt),
      totalCents: null,
      storeName: null,
      driverName: null,
      retailerOrderNumber: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZip: null,
      requestedDeliveryDate: request.requestedDeliveryDate,
      referralSource: request.referralSource,
      href: `/internal/dispatch/concierge/new?fromRequest=${request.id}`,
    });
  }

  // FIFO within each bucket except Completed, which reads newest-first
  // (recent history, not a work backlog) — set individually below
  // rather than a single global sort.
  items.sort((a, b) => {
    if (a.bucket === "completed" && b.bucket === "completed") {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return items;
}
