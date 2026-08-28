import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerPlaces, householdMembers, orders, shoppingLists, stores } from "@/lib/db/schema";

const ACTIVE_DELIVERY_STATUSES = ["paid", "driver_assigned", "picked_up", "in_transit"] as const;
const NEEDS_ATTENTION_STATUSES = ["quote_pending", "priced"] as const;

/**
 * Everything the account /home dashboard needs, in one place — real
 * aggregation over data that already exists (orders, places, lists,
 * household), not a new subsystem. "Next up" picks the single most
 * relevant order to surface: something actively moving through
 * fulfillment first, then something needing the customer's attention
 * (unpaid quote), so the dashboard always leads with whatever matters
 * most right now rather than just the newest row.
 */
export async function getAccountDashboard(ownerId: string) {
  const db = getDb();

  const [activeOrders, attentionOrders, recentOrders, defaultPlace, listCount, ownedMembers, membershipOf] =
    await Promise.all([
      db
        .select({
          id: orders.id,
          status: orders.status,
          serviceType: orders.serviceType,
          totalCents: orders.totalCents,
          requestedDeliveryDate: orders.requestedDeliveryDate,
          storeName: stores.name,
        })
        .from(orders)
        .leftJoin(stores, eq(orders.storeId, stores.id))
        .where(and(eq(orders.authUserId, ownerId), inArray(orders.status, [...ACTIVE_DELIVERY_STATUSES])))
        .orderBy(desc(orders.updatedAt))
        .limit(1),
      db
        .select({
          id: orders.id,
          status: orders.status,
          serviceType: orders.serviceType,
          totalCents: orders.totalCents,
          storeName: stores.name,
        })
        .from(orders)
        .leftJoin(stores, eq(orders.storeId, stores.id))
        .where(and(eq(orders.authUserId, ownerId), inArray(orders.status, [...NEEDS_ATTENTION_STATUSES])))
        .orderBy(desc(orders.updatedAt))
        .limit(1),
      db
        .select({
          id: orders.id,
          status: orders.status,
          serviceType: orders.serviceType,
          storeName: stores.name,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(stores, eq(orders.storeId, stores.id))
        .where(eq(orders.authUserId, ownerId))
        .orderBy(desc(orders.createdAt))
        .limit(5),
      db
        .select({ label: customerPlaces.label })
        .from(customerPlaces)
        .where(and(eq(customerPlaces.authUserId, ownerId), eq(customerPlaces.isDefault, true)))
        .limit(1),
      db.select({ id: shoppingLists.id }).from(shoppingLists).where(eq(shoppingLists.authUserId, ownerId)),
      db
        .select({ id: householdMembers.id })
        .from(householdMembers)
        .where(and(eq(householdMembers.ownerAuthUserId, ownerId), eq(householdMembers.status, "active"))),
      db
        .select({ id: householdMembers.id })
        .from(householdMembers)
        .where(and(eq(householdMembers.memberAuthUserId, ownerId), eq(householdMembers.status, "active"))),
    ]);

  return {
    // Actively out for delivery wins over "needs payment" — a customer
    // checking their dashboard cares more about "where is it" than a
    // reminder they could see equally well on My Requests.
    nextUp: activeOrders[0] ?? attentionOrders[0] ?? null,
    recentOrders,
    defaultPlaceName: defaultPlace[0]?.label ?? null,
    listCount: listCount.length,
    householdMemberCount: ownedMembers.length,
    isHouseholdMember: membershipOf.length > 0,
  };
}
