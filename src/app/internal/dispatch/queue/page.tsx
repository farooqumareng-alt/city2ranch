import type { Metadata } from "next";
import { asc, eq, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { QueueBoard } from "@/components/dispatch/QueueBoard";

export const metadata: Metadata = { title: "Dispatch Queue" };

// Orders that are actionable from dispatch: paid orders need a driver,
// and once assigned they stay visible here until they leave the driver's
// hands (completed/cancelled/failed drop off the queue).
const ACTIVE_STATUSES = ["paid", "driver_assigned", "picked_up", "in_transit"] as const;

export default async function DispatchQueuePage() {
  const db = getDb();

  const [activeOrders, activeDrivers] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
        serviceType: orders.serviceType,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        deliveryZip: orders.deliveryZip,
        requestedDeliveryDate: orders.requestedDeliveryDate,
        totalCents: orders.totalCents,
        storeName: stores.name,
        driverName: drivers.name,
      })
      .from(orders)
      // leftJoin: a concierge order may have no store at all.
      .leftJoin(stores, eq(orders.storeId, stores.id))
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
      <QueueBoard orders={activeOrders} driverOptions={driverOptions} />
    </div>
  );
}
