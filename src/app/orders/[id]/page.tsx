import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { approveAndPayOrder } from "@/lib/actions/approve-and-pay";

export const metadata: Metadata = { title: "Order Details" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      authUserId: orders.authUserId,
      retailerOrderNumber: orders.retailerOrderNumber,
      pickupNotes: orders.pickupNotes,
      deliveryAddressLine1: orders.deliveryAddressLine1,
      deliveryAddressLine2: orders.deliveryAddressLine2,
      deliveryCity: orders.deliveryCity,
      deliveryState: orders.deliveryState,
      deliveryZip: orders.deliveryZip,
      serviceLabel: orders.serviceLabel,
      totalCents: orders.totalCents,
      deliveryPin: orders.deliveryPin,
      paidAt: orders.paidAt,
      completedAt: orders.completedAt,
      storeName: stores.name,
      storeAddress: stores.addressLine1,
      driverName: drivers.name,
    })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(eq(orders.id, id));

  const order = rows[0];

  // Not found (wrong id) and not-yours (wrong owner) both 404 — an order
  // id belonging to someone else must never distinguish "doesn't exist"
  // from "exists but isn't yours."
  if (!order || order.authUserId !== user.id) notFound();

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow={ORDER_STATUS_LABELS[order.status]}
        title={`Order from ${order.storeName}`}
        description={`Placed ${new Date(order.createdAt).toLocaleString()}`}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-lg text-navy-deep">Pickup</h3>
            <p className="font-sans text-sm text-charcoal/70">
              {order.storeName} — {order.storeAddress}
            </p>
            <p className="font-sans text-sm text-charcoal/70">
              Order #{order.retailerOrderNumber}
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-navy-deep">Delivery</h3>
            <p className="font-sans text-sm text-charcoal/70">
              {order.deliveryAddressLine1}
              {order.deliveryAddressLine2 ? `, ${order.deliveryAddressLine2}` : ""}
              <br />
              {order.deliveryCity}, {order.deliveryState} {order.deliveryZip}
            </p>
          </div>
          {order.driverName ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Your Driver</h3>
              <p className="font-sans text-sm text-charcoal/70">{order.driverName}</p>
            </div>
          ) : null}
          {order.deliveryPin ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Delivery PIN</h3>
              <p className="font-serif text-2xl tracking-widest text-gold">
                {order.deliveryPin}
              </p>
              <p className="font-sans text-xs text-charcoal/60">
                Give this to your driver at delivery to confirm it&apos;s you.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
          <h3 className="font-serif text-lg text-navy-deep">Price</h3>
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm text-charcoal/70">{order.serviceLabel}</p>
            <p className="font-serif text-3xl text-navy-deep">
              ${(order.totalCents / 100).toFixed(2)}
            </p>
          </div>

          {order.status === "priced" ? (
            <>
              <p className="font-sans text-xs text-charcoal/60">
                Final pricing confirmed before service begins.
              </p>
              <form action={approveAndPayOrder.bind(null, order.id)}>
                <Button type="submit" variant="gold" className="w-full">
                  Approve &amp; Pay
                </Button>
              </form>
            </>
          ) : (
            <p className="font-sans text-sm text-charcoal/70">
              Status: {ORDER_STATUS_LABELS[order.status]}
            </p>
          )}
        </div>
      </div>
    </Container>
  );
}
