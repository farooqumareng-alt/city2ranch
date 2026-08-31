import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, stores, serviceRequests } from "@/lib/db/schema";
import { REQUEST_STATUS_LABELS } from "@/lib/requests";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * The unified "My Services" query — approved blueprint §Entities: no
 * new table, just orders + service_requests (pre-conversion only)
 * merged and sorted together. This replaces three separate page
 * queries (/orders, /deliveries, /requests) with one; each of those
 * routes now just redirects here (see their page.tsx files).
 */
export type MyServiceBucket = "needs_action" | "active" | "completed";

export type MyServiceItem = {
  id: string;
  kind: "order" | "request";
  title: string;
  createdAt: Date;
  statusLabel: string;
  bucket: MyServiceBucket;
  totalCents: number | null;
  /** null for an order that hasn't been claimed yet — rendered with a
   *  claim form instead of a link, matching /orders/page.tsx's existing
   *  pattern (see claim-order.ts). */
  href: string | null;
  needsClaim: boolean;
};

const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "payment_pending",
  "paid",
  "pending_acceptance",
  "driver_assigned",
  "picked_up",
  "in_transit",
];
const COMPLETED_ORDER_STATUSES: readonly OrderStatus[] = ["completed", "cancelled", "failed"];

function bucketForOrderStatus(status: OrderStatus): MyServiceBucket {
  if (status === "priced") return "needs_action";
  if ((COMPLETED_ORDER_STATUSES as readonly string[]).includes(status)) return "completed";
  // quote_pending falls through to here too (Concierge, pre-quote) —
  // deliberately "active," same as a not-yet-converted service_requests
  // row: nothing for the customer to act on yet.
  if (!(ACTIVE_ORDER_STATUSES as readonly string[]).includes(status) && status !== "quote_pending") {
    // Every OrderStatus is accounted for above except quote_pending —
    // this only fires if a new status is ever added to the enum without
    // updating this map, so it fails loudly instead of silently
    // mis-bucketing a real order.
    throw new Error(`Unhandled order status in My Services bucketing: ${status}`);
  }
  return "active";
}

export async function getMyServices(ownerId: string, ownerEmail: string): Promise<MyServiceItem[]> {
  const db = getDb();

  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      serviceType: orders.serviceType,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      authUserId: orders.authUserId,
      storeName: stores.name,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(
      or(
        eq(orders.authUserId, ownerId),
        // Unclaimed staff-created concierge order, matched by email —
        // same rule /orders/page.tsx already used.
        and(isNull(orders.authUserId), sql`lower(${orders.customerEmail}) = lower(${ownerEmail})`)
      )
    )
    .orderBy(desc(orders.createdAt));

  // getOwnServiceRequests's own left join already tells us which
  // requests have already become an order — only the still-null ones
  // belong in this list, so a converted request never renders as a
  // second, duplicate card next to its own order.
  const requestRows = await db
    .select({
      id: serviceRequests.id,
      createdAt: serviceRequests.createdAt,
      status: serviceRequests.status,
      orderId: orders.id,
    })
    .from(serviceRequests)
    .leftJoin(orders, eq(orders.serviceRequestId, serviceRequests.id))
    .where(sql`lower(${serviceRequests.email}) = lower(${ownerEmail})`)
    .orderBy(desc(serviceRequests.createdAt));

  const items: MyServiceItem[] = [];

  for (const order of orderRows) {
    const claimed = Boolean(order.authUserId);
    items.push({
      id: order.id,
      kind: "order",
      title: order.serviceType === "concierge" ? "Concierge Shopping" : (order.storeName ?? "City Pickup"),
      createdAt: new Date(order.createdAt),
      statusLabel: ORDER_STATUS_LABELS[order.status],
      bucket: bucketForOrderStatus(order.status),
      totalCents: order.totalCents,
      href: claimed ? `/my-services/${order.id}` : null,
      needsClaim: !claimed,
    });
  }

  for (const request of requestRows) {
    if (request.orderId) continue; // already represented by its order above
    items.push({
      id: request.id,
      kind: "request",
      title: "Concierge Shopping",
      createdAt: new Date(request.createdAt),
      statusLabel: REQUEST_STATUS_LABELS[request.status] ?? "Under review",
      bucket: "active", // nothing for the customer to act on yet
      totalCents: null,
      href: `/my-services/request/${request.id}`,
      needsClaim: false,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items;
}
