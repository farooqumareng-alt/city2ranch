import type { Metadata } from "next";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { markPickedUp } from "@/lib/actions/driver-mark-picked-up";
import { markInTransit } from "@/lib/actions/driver-mark-in-transit";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { ReportProblemForm } from "@/components/driver/ReportProblemForm";
import { ConfirmDeliveryForm } from "@/components/driver/ConfirmDeliveryForm";
import { getOrderItems } from "@/lib/orders/concierge";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "My Deliveries" };

const ASSIGNED_STATUSES = ["driver_assigned", "picked_up", "in_transit"] as const;
const RECENT_LOOKBACK_DAYS = 7;

/** A plain Google Maps deep link built from address columns already on
 *  the order/store — no maps library, no API key, nothing tracked. */
function mapsUrl(line1: string, city: string, state: string, zip?: string | null) {
  const destination = encodeURIComponent(`${line1}, ${city}, ${state}${zip ? " " + zip : ""}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

// Pulled out of the page component's body — React's purity rule flags
// Date.now() called directly during a component's render as an impure
// read of ambient state, even in an async Server Component.
function recentSinceDate(): Date {
  return new Date(Date.now() - RECENT_LOOKBACK_DAYS * 24 * 3_600_000);
}

export default async function DriverPage() {
  const driver = await requireDriver();
  const db = getDb();
  const recentSince = recentSinceDate();

  const [assignedOrders, recentOrders] = await Promise.all([
    // Deliberately never joins orderDeliveryPins here — the driver must
    // ask the customer for it in person, never read it off this page
    // (the table also has no RLS policy at all, so it isn't reachable
    // from a driver's own PostgREST session either).
    db
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
      .orderBy(asc(orders.assignedAt)),

    // Closes a real gap: before this, a job vanished from the driver's
    // view the instant it left an active status — no way to see
    // anything about a delivery they just finished. Read-only, no
    // actions; last 7 days is a reasonable "still relevant" window.
    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        storeName: stores.name,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(
          eq(orders.driverId, driver.id),
          inArray(orders.status, ["completed", "failed"]),
          gte(orders.updatedAt, recentSince)
        )
      )
      .orderBy(desc(orders.updatedAt))
      .limit(10),
  ]);

  const itemsByOrder = new Map<string, Awaited<ReturnType<typeof getOrderItems>>>();
  for (const order of assignedOrders) {
    if (order.serviceType === "concierge") {
      itemsByOrder.set(order.id, await getOrderItems(order.id));
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="DRIVER"
          title="My Deliveries"
          description="Your assigned pickups, in order of assignment."
        />

        {assignedOrders.length === 0 ? (
          <EmptyState message="Nothing assigned to you right now." />
        ) : (
          <div className="flex flex-col gap-6">
            {assignedOrders.map((order) => {
              const deliveryMapsUrl = mapsUrl(
                order.deliveryAddressLine1,
                order.deliveryCity,
                order.deliveryState,
                order.deliveryZip
              );
              const pickupMapsUrl =
                order.serviceType === "pickup" && order.storeAddress
                  ? mapsUrl(order.storeAddress, order.storeCity ?? "", order.storeState ?? "")
                  : null;

              return (
                <Card key={order.id} className="flex flex-col gap-4">
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
                        <p className="font-serif text-lg text-navy-deep">Pickup: {order.storeName}</p>
                        <p className="font-sans text-sm text-charcoal/70">
                          {order.storeAddress}, {order.storeCity}, {order.storeState}
                        </p>
                        <p className="font-sans text-xs text-charcoal/60">
                          Order #{order.retailerOrderNumber}
                          {order.pickupNotes ? ` — ${order.pickupNotes}` : ""}
                        </p>
                      </div>
                    )}
                    <StatusBadge status={order.status} />
                  </div>

                  {order.status === "driver_assigned" && pickupMapsUrl ? (
                    <a
                      href={pickupMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start font-sans text-sm font-medium text-gold underline decoration-gold/40 hover:text-gold-light"
                    >
                      Navigate to pickup →
                    </a>
                  ) : null}

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
                      <p className="font-sans text-xs text-charcoal/60">Note: {order.customerNotes}</p>
                    ) : null}
                    {order.requestedDeliveryDate ? (
                      <p className="font-sans text-xs text-charcoal/60">
                        Requested for: {formatPlainDate(order.requestedDeliveryDate)}
                      </p>
                    ) : null}
                    <a
                      href={deliveryMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-sans text-sm font-medium text-gold underline decoration-gold/40 hover:text-gold-light"
                    >
                      Navigate to delivery →
                    </a>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-navy/10 pt-4">
                    {order.status === "driver_assigned" ? (
                      <JobActionButton
                        action={markPickedUp.bind(null, order.id)}
                        label="Mark Picked Up"
                        pendingLabel="Saving…"
                      />
                    ) : null}
                    {order.status === "picked_up" ? (
                      <JobActionButton
                        action={markInTransit.bind(null, order.id)}
                        label="Mark On The Way"
                        pendingLabel="Saving…"
                      />
                    ) : null}
                    {order.status === "in_transit" ? <ConfirmDeliveryForm orderId={order.id} /> : null}
                    <ReportProblemForm orderId={order.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Recently Completed</h3>
        {recentOrders.length === 0 ? (
          <EmptyState message="Nothing completed in the last week yet." />
        ) : (
          <RowList>
            {recentOrders.map((order) => (
              <Row key={order.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">
                    {order.serviceType === "concierge" ? "Concierge Order" : order.storeName}
                  </p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Row>
            ))}
          </RowList>
        )}
      </div>
    </div>
  );
}
