import type { Metadata } from "next";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "History" };

const RECENT_LOOKBACK_DAYS = 7;

// Pulled out of the page component's body — React's purity rule flags
// Date.now() called directly during a component's render as an impure
// read of ambient state, even in an async Server Component.
function recentSinceDate(): Date {
  return new Date(Date.now() - RECENT_LOOKBACK_DAYS * 24 * 3_600_000);
}

/** The "Recently Completed" view, relocated verbatim off Today's Jobs —
 *  no action coupling at all, so it moved with zero logic changes. */
export default async function DriverHistoryPage() {
  const driver = await requireDriver();
  const db = getDb();
  const recentSince = recentSinceDate();

  const recentOrders = await db
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
    .limit(10);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading eyebrow="DRIVER" title="History" description="Your completed jobs from the last 7 days." />
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
                <p className="font-sans text-xs text-charcoal/60">{new Date(order.updatedAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={order.status} />
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
