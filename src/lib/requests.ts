import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, serviceRequests } from "@/lib/db/schema";

/**
 * A signed-in customer's own /request-service submissions — real,
 * pre-existing data (service_requests) that was previously invisible to
 * the customer entirely: "My Orders" only shows a request once staff has
 * converted it into a real order (see create-concierge-order.ts), so
 * between submitting and that conversion a customer had no way to see
 * their request was received at all. Matched by email, the same
 * ownership model service_requests already has everywhere else (it has
 * no auth_user_id column — see its schema comment) — not a security
 * boundary (this table has no per-customer secrets), just a "here's what
 * you told us" view.
 */
// Customer-facing wording for service_requests.status — distinct from
// the internal "new/contacted/converted/closed" pipeline language staff
// sees, and from ORDER_STATUS_LABELS (a request isn't an order yet).
// Lives here, not in a page component, so both /my-services and any
// future staff-facing reuse read the same wording — moved out of the
// old /requests page when My Services absorbed it.
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "Received — awaiting review",
  contacted: "Your concierge is in touch",
  converted: "Quote in progress",
  closed: "Closed",
};

export async function getOwnServiceRequests(email: string) {
  const db = getDb();
  return db
    .select({
      id: serviceRequests.id,
      createdAt: serviceRequests.createdAt,
      serviceType: serviceRequests.serviceType,
      shoppingList: serviceRequests.shoppingList,
      timingPreference: serviceRequests.timingPreference,
      requestedDeliveryDate: serviceRequests.requestedDeliveryDate,
      status: serviceRequests.status,
      orderId: orders.id,
    })
    .from(serviceRequests)
    .leftJoin(orders, eq(orders.serviceRequestId, serviceRequests.id))
    .where(sql`lower(${serviceRequests.email}) = lower(${email})`)
    .orderBy(desc(serviceRequests.createdAt));
}
