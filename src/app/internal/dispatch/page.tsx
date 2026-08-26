import type { Metadata } from "next";
import { asc, eq, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { canTransition } from "@/lib/orders/status";
import { cancelOrder, failOrder } from "@/lib/actions/staff-order-exceptions";
import { AssignDriverForm } from "@/components/dispatch/AssignDriverForm";
import { OrderExceptionForm } from "@/components/dispatch/OrderExceptionForm";

export const metadata: Metadata = { title: "Dispatch" };

// Orders that are actionable from dispatch: paid orders need a driver,
// and once assigned they stay visible here until they leave the driver's
// hands (completed/cancelled/failed drop off the queue).
const ACTIVE_STATUSES = ["paid", "driver_assigned", "picked_up", "in_transit"] as const;

export default async function DispatchPage() {
  const db = getDb();

  const [activeOrders, activeDrivers] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        deliveryZip: orders.deliveryZip,
        totalCents: orders.totalCents,
        storeName: stores.name,
        driverName: drivers.name,
      })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .leftJoin(drivers, eq(orders.driverId, drivers.id))
      .where(inArray(orders.status, ACTIVE_STATUSES))
      .orderBy(asc(orders.createdAt)),
    db
      .select({ id: drivers.id, name: drivers.name })
      .from(drivers)
      .where(eq(drivers.isActive, true)),
  ]);

  const driverOptions = activeDrivers.map((d) => ({ value: d.id, label: d.name }));

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Dispatch Queue"
        description="Orders awaiting a driver, or already in the driver's hands."
      />

      {activeOrders.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          Nothing needs attention right now.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {activeOrders.map((order) => {
            const canCancel = canTransition(order.status, "cancelled");
            const canFail = canTransition(order.status, "failed");
            return (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-lg text-navy-deep">
                      {order.customerName} — {order.storeName}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      Order #{order.retailerOrderNumber} · {order.deliveryCity},{" "}
                      {order.deliveryState} {order.deliveryZip} ·{" "}
                      {order.customerPhone}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      Placed {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-sans text-sm font-medium text-navy-deep">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-sans text-sm text-charcoal/70">
                      ${(order.totalCents / 100).toFixed(2)}
                    </span>
                    {order.driverName ? (
                      <span className="font-sans text-xs text-charcoal/60">
                        Driver: {order.driverName}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-navy/10 pt-4">
                  {order.status === "paid" ? (
                    <AssignDriverForm orderId={order.id} driverOptions={driverOptions} />
                  ) : null}
                  {canCancel ? (
                    <OrderExceptionForm
                      orderId={order.id}
                      action={cancelOrder}
                      label="Cancel"
                    />
                  ) : null}
                  {canFail ? (
                    <OrderExceptionForm orderId={order.id} action={failOrder} label="Flag failed" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
