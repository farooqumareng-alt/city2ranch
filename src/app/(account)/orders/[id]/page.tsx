import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { approveAndPayOrder } from "@/lib/actions/approve-and-pay";
import { getOrderItems, getOrderFeeLines } from "@/lib/orders/concierge";

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
      serviceType: orders.serviceType,
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
    // leftJoin, not innerJoin: a concierge order has no storeId until
    // staff picks one while building the quote.
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(eq(orders.id, id));

  const order = rows[0];

  // Not found (wrong id) and not-yours (wrong owner) both 404 — an order
  // id belonging to someone else must never distinguish "doesn't exist"
  // from "exists but isn't yours."
  if (!order || order.authUserId !== user.id) notFound();

  const isConcierge = order.serviceType === "concierge";
  const [items, feeLines] = isConcierge
    ? await Promise.all([getOrderItems(order.id), getOrderFeeLines(order.id)])
    : [[], []];

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow={ORDER_STATUS_LABELS[order.status]}
        title={isConcierge ? "Concierge Request" : `Order from ${order.storeName}`}
        description={`Placed ${new Date(order.createdAt).toLocaleString()}`}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          {isConcierge ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Shopping List</h3>
              {items.length === 0 ? (
                <p className="font-sans text-sm text-charcoal/70">
                  Your concierge is preparing your shopping list.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="font-sans text-sm text-charcoal/70">
                      {item.itemName} <span className="text-charcoal/50">— {item.quantity}</span>
                      {item.notes ? (
                        <span className="text-charcoal/50"> ({item.notes})</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
          <div>
            <h3 className="font-serif text-lg text-navy-deep">Pickup</h3>
            <p className="font-sans text-sm text-charcoal/70">
              {order.storeName} — {order.storeAddress}
            </p>
            <p className="font-sans text-sm text-charcoal/70">
              Order #{order.retailerOrderNumber}
            </p>
          </div>
          )}
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
          <h3 className="font-serif text-lg text-navy-deep">
            {isConcierge ? "Quote" : "Price"}
          </h3>

          {isConcierge && order.status === "quote_pending" ? (
            <p className="font-sans text-sm text-charcoal/70">
              Your City2Ranch concierge is preparing your quote — you&apos;ll
              be notified once it&apos;s ready to review and approve.
            </p>
          ) : isConcierge && feeLines.length > 0 ? (
            <dl className="flex flex-col gap-2 font-sans text-sm">
              {feeLines.map((line) => (
                <div key={line.id} className="flex justify-between">
                  <dt className="text-charcoal/70">{line.label}</dt>
                  <dd>${(line.amountCents / 100).toFixed(2)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-navy/10 pt-2 font-medium text-navy-deep">
                <dt>Total</dt>
                <dd>${(order.totalCents / 100).toFixed(2)}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-sans text-sm text-charcoal/70">{order.serviceLabel}</p>
              <p className="font-serif text-3xl text-navy-deep">
                ${(order.totalCents / 100).toFixed(2)}
              </p>
            </div>
          )}

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
    </div>
  );
}
