import type { Metadata } from "next";
import { and, asc, eq, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { markPickedUp } from "@/lib/actions/driver-mark-picked-up";
import { markInTransit } from "@/lib/actions/driver-mark-in-transit";
import { ConfirmDeliveryForm } from "@/components/driver/ConfirmDeliveryForm";
import { getOrderItems } from "@/lib/orders/concierge";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "My Deliveries" };

const ASSIGNED_STATUSES = ["driver_assigned", "picked_up", "in_transit"] as const;

export default async function DriverPage() {
  const driver = await requireDriver();

  const db = getDb();
  // Deliberately does NOT select orders.deliveryPin — the driver must ask
  // the customer for it in person, never read it off this page.
  const assignedOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      serviceType: orders.serviceType,
      assignedAt: orders.assignedAt,
      retailerOrderNumber: orders.retailerOrderNumber,
      pickupNotes: orders.pickupNotes,
      deliveryAddressLine1: orders.deliveryAddressLine1,
      deliveryAddressLine2: orders.deliveryAddressLine2,
      deliveryCity: orders.deliveryCity,
      deliveryState: orders.deliveryState,
      deliveryZip: orders.deliveryZip,
      customerNotes: orders.customerNotes,
      requestedDeliveryDate: orders.requestedDeliveryDate,
      storeName: stores.name,
      storeAddress: stores.addressLine1,
      storeCity: stores.city,
      storeState: stores.state,
    })
    .from(orders)
    // leftJoin: a concierge order may have no store at all.
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(and(eq(orders.driverId, driver.id), inArray(orders.status, ASSIGNED_STATUSES)))
    .orderBy(asc(orders.assignedAt));

  const itemsByOrder = new Map<string, Awaited<ReturnType<typeof getOrderItems>>>();
  for (const order of assignedOrders) {
    if (order.serviceType === "concierge") {
      itemsByOrder.set(order.id, await getOrderItems(order.id));
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="DRIVER"
        title="My Deliveries"
        description="Your assigned pickups, in order of assignment."
      />

      {assignedOrders.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          Nothing assigned to you right now.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {assignedOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {order.serviceType === "concierge" ? (
                  <div>
                    <p className="font-serif text-lg text-navy-deep">Concierge Order</p>
                    {order.pickupNotes ? (
                      <p className="font-sans text-xs text-charcoal/60">{order.pickupNotes}</p>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <p className="font-serif text-lg text-navy-deep">
                      Pickup: {order.storeName}
                    </p>
                    <p className="font-sans text-sm text-charcoal/70">
                      {order.storeAddress}, {order.storeCity}, {order.storeState}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      Order #{order.retailerOrderNumber}
                      {order.pickupNotes ? ` — ${order.pickupNotes}` : ""}
                    </p>
                  </div>
                )}
                <span className="font-sans text-sm font-medium text-navy-deep">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              {order.serviceType === "concierge" ? (
                <div>
                  <p className="font-serif text-lg text-navy-deep">Shopping List</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {(itemsByOrder.get(order.id) ?? []).map((item) => (
                      <li key={item.id} className="font-sans text-sm text-charcoal/70">
                        {item.itemName} <span className="text-charcoal/50">— {item.quantity}</span>
                        {item.notes ? <span className="text-charcoal/50"> ({item.notes})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="font-serif text-lg text-navy-deep">Deliver to</p>
                <p className="font-sans text-sm text-charcoal/70">
                  {order.deliveryAddressLine1}
                  {order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ""}
                  <br />
                  {order.deliveryCity}, {order.deliveryState} {order.deliveryZip}
                </p>
                {order.customerNotes ? (
                  <p className="font-sans text-xs text-charcoal/60">
                    Note: {order.customerNotes}
                  </p>
                ) : null}
                {order.requestedDeliveryDate ? (
                  <p className="font-sans text-xs text-charcoal/60">
                    Requested for: {formatPlainDate(order.requestedDeliveryDate)}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-navy/10 pt-4">
                {order.status === "driver_assigned" ? (
                  <form action={markPickedUp.bind(null, order.id)}>
                    <Button type="submit" variant="navy">
                      Mark picked up
                    </Button>
                  </form>
                ) : null}
                {order.status === "picked_up" ? (
                  <form action={markInTransit.bind(null, order.id)}>
                    <Button type="submit" variant="navy">
                      Mark on the way
                    </Button>
                  </form>
                ) : null}
                {order.status === "in_transit" ? (
                  <ConfirmDeliveryForm orderId={order.id} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
