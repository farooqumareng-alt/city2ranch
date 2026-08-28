import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "My Deliveries",
  description: "Track your City2Ranch deliveries.",
};

// Same underlying orders table as "My Orders" — that page is the
// transactional record (every order, any status, what you paid). This
// page is the fulfillment lens: only orders that have actually entered
// or finished the physical delivery pipeline, with driver/tracking
// details front and center instead of price. No schema change, no new
// table — just a different filter and a different card.
const IN_PROGRESS_STATUSES = ["paid", "driver_assigned", "picked_up", "in_transit"] as const;

export default async function DeliveriesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      serviceType: orders.serviceType,
      requestedDeliveryDate: orders.requestedDeliveryDate,
      completedAt: orders.completedAt,
      storeName: stores.name,
      driverName: drivers.name,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(and(eq(orders.authUserId, ownerId), inArray(orders.status, [...IN_PROGRESS_STATUSES, "completed"])))
    .orderBy(desc(orders.updatedAt));

  const inProgress = rows.filter((r) => r.status !== "completed");
  const delivered = rows.filter((r) => r.status === "completed");

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="My Deliveries"
        description="Where your requests stand once City2Ranch is actively on it."
      />

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">In Progress</h3>
        {inProgress.length === 0 ? (
          <p className="font-sans text-sm text-charcoal/70">Nothing in progress right now.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
            {inProgress.map((d) => (
              <Link
                key={d.id}
                href={`/orders/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-4 py-4 hover:bg-white/50"
              >
                <div>
                  <p className="font-serif text-base text-navy-deep">
                    {d.serviceType === "concierge" ? "Concierge Order" : (d.storeName ?? "Order")}
                  </p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {d.driverName ? `Driver: ${d.driverName}` : "Awaiting driver"}
                    {d.requestedDeliveryDate ? ` · Requested for ${formatPlainDate(d.requestedDeliveryDate)}` : ""}
                  </p>
                </div>
                <span className="font-sans text-sm font-medium text-navy-deep">
                  {ORDER_STATUS_LABELS[d.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Delivered</h3>
        {delivered.length === 0 ? (
          <p className="font-sans text-sm text-charcoal/70">Nothing delivered yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
            {delivered.map((d) => (
              <Link
                key={d.id}
                href={`/orders/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-4 py-4 hover:bg-white/50"
              >
                <p className="font-serif text-base text-navy-deep">
                  {d.serviceType === "concierge" ? "Concierge Order" : (d.storeName ?? "Order")}
                </p>
                <span className="font-sans text-sm text-charcoal/70">
                  ✓ Delivered{d.completedAt ? ` — ${new Date(d.completedAt).toLocaleDateString()}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
