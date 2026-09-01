import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Today's Jobs" };

const IN_PROGRESS_STATUSES = ["driver_assigned", "picked_up", "in_transit"] as const;

/**
 * Today's Jobs — a plain list of tappable cards, no inline actions at
 * all. Every action (Accept/Decline, Navigate, Confirm Pickup, On The
 * Way, PIN entry, Report a Problem) lives on the Job Detail screen
 * (/internal/driver/[id]) now — matching the brief's own flow of
 * tapping into a job before acting, and keeping this list scannable on
 * a phone. "Recently Completed" moved to its own page (/internal/driver/
 * history) since it has no action coupling and doesn't belong on the
 * active-work list.
 */
export default async function DriverPage() {
  const driver = await requireDriver();
  const db = getDb();

  const [pendingOrders, inProgressOrders] = await Promise.all([
    db
      .select({
        id: orders.id,
        serviceType: orders.serviceType,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        storeName: stores.name,
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(and(eq(orders.driverId, driver.id), eq(orders.status, "pending_acceptance")))
      .orderBy(asc(orders.assignedAt)),

    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        retailerOrderNumber: orders.retailerOrderNumber,
        deliveryCity: orders.deliveryCity,
        deliveryState: orders.deliveryState,
        storeName: stores.name,
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(and(eq(orders.driverId, driver.id), inArray(orders.status, IN_PROGRESS_STATUSES)))
      .orderBy(asc(orders.assignedAt)),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="DRIVER"
        title="Today's Jobs"
        description="Tap a job to see details and the next step."
      />

      {pendingOrders.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-serif text-lg text-navy-deep">Needs Your Response</h3>
          <div className="flex flex-col gap-3">
            {pendingOrders.map((order) => (
              <Link key={order.id} href={`/internal/driver/${order.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 hover:shadow-md">
                  <div>
                    <p className="font-serif text-base text-navy-deep">
                      {order.serviceType === "concierge" ? "Concierge Order" : `Pickup: ${order.storeName}`}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      {order.deliveryCity}, {order.deliveryState}
                      {order.retailerOrderNumber ? ` · Order #${order.retailerOrderNumber}` : ""}
                    </p>
                  </div>
                  <span className="font-sans text-sm font-semibold text-gold">Respond →</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">In Progress</h3>
        {inProgressOrders.length === 0 ? (
          <EmptyState message="Nothing in progress right now." />
        ) : (
          <div className="flex flex-col gap-3">
            {inProgressOrders.map((order) => (
              <Link key={order.id} href={`/internal/driver/${order.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 hover:shadow-md">
                  <div>
                    <p className="font-serif text-base text-navy-deep">
                      {order.serviceType === "concierge" ? "Concierge Order" : `Pickup: ${order.storeName}`}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      {order.deliveryCity}, {order.deliveryState}
                      {order.retailerOrderNumber ? ` · Order #${order.retailerOrderNumber}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
