import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores, drivers } from "@/lib/db/schema";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { canTransition } from "@/lib/orders/status";
import { getOrderItems, getOrderFeeLines } from "@/lib/orders/concierge";
import { getOrderTimeline } from "@/lib/audit-timeline";
import { ServiceTimeline } from "@/components/services/ServiceTimeline";
import { ConciergeQuoteForm } from "@/components/dispatch/ConciergeQuoteForm";
import { AssignDriverForm } from "@/components/dispatch/AssignDriverForm";
import { OrderExceptionForm } from "@/components/dispatch/OrderExceptionForm";
import { cancelOrder, failOrder } from "@/lib/actions/staff-order-exceptions";
import { formatPlainDate } from "@/lib/format";
import { getOrderMessages } from "@/lib/order-messages";
import { OrderMessageThread } from "@/components/orders/OrderMessageThread";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Service Record" };

/**
 * The unified staff Service Record (approved blueprint) — one detail
 * page for every order regardless of service type or status. Replaces
 * /internal/dispatch/concierge/[id] (which only ever handled concierge
 * orders and 404'd on a City Pickup one — that page now redirects
 * here). This is the staff side of the same underlying `orders` row
 * /my-services/[id] shows the customer; nothing here is hidden from
 * staff the way it is on that page.
 *
 * No "Internal Notes" section: the blueprint's screen inventory names
 * one, but there's no internal-notes column on `orders` today and this
 * slice doesn't add one — a real gap, not silently invented around.
 */
export default async function ServiceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Re-checked here, not just relied on via DispatchLayout — this page
  // queries one specific customer's full order record directly.
  await requireStaff();
  const { id } = await params;
  const db = getDb();

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      serviceType: orders.serviceType,
      createdAt: orders.createdAt,
      authUserId: orders.authUserId,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      retailerOrderNumber: orders.retailerOrderNumber,
      pickupNotes: orders.pickupNotes,
      customerNotes: orders.customerNotes,
      deliveryAddressLine1: orders.deliveryAddressLine1,
      deliveryAddressLine2: orders.deliveryAddressLine2,
      deliveryCity: orders.deliveryCity,
      deliveryState: orders.deliveryState,
      deliveryZip: orders.deliveryZip,
      requestedDeliveryDate: orders.requestedDeliveryDate,
      serviceLabel: orders.serviceLabel,
      totalCents: orders.totalCents,
      paidAt: orders.paidAt,
      completedAt: orders.completedAt,
      cancellationReason: orders.cancellationReason,
      failureReason: orders.failureReason,
      storeName: stores.name,
      storeAddress: stores.addressLine1,
      driverName: drivers.name,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(eq(orders.id, id));

  const order = rows[0];
  if (!order) notFound();

  const isConcierge = order.serviceType === "concierge";
  const [items, feeLines, messages, timeline, activeDrivers] = await Promise.all([
    isConcierge ? getOrderItems(order.id) : Promise.resolve([]),
    isConcierge ? getOrderFeeLines(order.id) : Promise.resolve([]),
    getOrderMessages(order.id),
    getOrderTimeline(order.id),
    order.status === "paid"
      ? db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.isActive, true))
      : Promise.resolve([]),
  ]);
  const driverOptions = activeDrivers.map((d) => ({ value: d.id, label: d.name }));
  const canCancel = canTransition(order.status, "cancelled");
  const canFail = canTransition(order.status, "failed");

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow={ORDER_STATUS_LABELS[order.status]}
        title={`${isConcierge ? "Concierge Order" : "City Pickup"} — ${order.customerName}`}
        description={`${order.customerEmail} · ${order.customerPhone}${
          order.requestedDeliveryDate ? ` · Requested for ${formatPlainDate(order.requestedDeliveryDate)}` : ""
        }`}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-6">
          {order.authUserId ? (
            <Link
              href={`/internal/dispatch/admin/customers/${order.authUserId}`}
              className="self-start font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
            >
              View Customer →
            </Link>
          ) : null}

          {isConcierge ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Shopping List</h3>
              {items.length === 0 ? (
                <p className="font-sans text-sm text-charcoal/70">No items recorded.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-sm border border-navy/10 bg-white/60 p-3">
                      <p className="font-sans text-sm text-navy-deep">
                        {item.itemName} <span className="text-charcoal/60">— {item.quantity}</span>
                      </p>
                      {item.notes ? <p className="font-sans text-xs text-charcoal/60">{item.notes}</p> : null}
                      {item.substitutionNote ? (
                        <p className="font-sans text-xs text-gold">
                          {item.status}: {item.substitutionNote}
                        </p>
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
              <p className="font-sans text-sm text-charcoal/70">Order #{order.retailerOrderNumber}</p>
              {order.pickupNotes ? (
                <p className="font-sans text-xs text-charcoal/60">{order.pickupNotes}</p>
              ) : null}
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

          {order.customerNotes ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Customer Notes</h3>
              <p className="font-sans text-sm text-charcoal/70">{order.customerNotes}</p>
            </div>
          ) : null}

          {order.driverName ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Driver</h3>
              <p className="font-sans text-sm text-charcoal/70">{order.driverName}</p>
            </div>
          ) : null}

          {order.cancellationReason ? (
            <p className="font-sans text-sm text-red-600">Cancelled: {order.cancellationReason}</p>
          ) : null}
          {order.failureReason ? (
            <p className="font-sans text-sm text-red-600">Failed: {order.failureReason}</p>
          ) : null}

          <ServiceTimeline entries={timeline} />
        </div>

        <div className="flex flex-col gap-6">
          {isConcierge ? (
            <ConciergeQuoteForm
              orderId={order.id}
              status={order.status}
              existingFeeLines={feeLines.map((l) => ({ label: l.label, amountCents: l.amountCents }))}
            />
          ) : (
            <div className="flex flex-col gap-2 rounded-sm border border-navy/10 bg-white/60 p-6">
              <h3 className="font-serif text-lg text-navy-deep">Price</h3>
              <p className="font-sans text-sm text-charcoal/70">{order.serviceLabel}</p>
              <p className="font-serif text-3xl text-navy-deep">${(order.totalCents / 100).toFixed(2)}</p>
              <p className="font-sans text-xs text-charcoal/60">
                Computed automatically at submission — City Pickup pricing has no manual override.
              </p>
            </div>
          )}

          {order.status === "paid" ? (
            <div className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6">
              <h3 className="font-serif text-lg text-navy-deep">Assign Driver</h3>
              <AssignDriverForm orderId={order.id} driverOptions={driverOptions} />
            </div>
          ) : null}

          {canCancel || canFail ? (
            <div className="flex flex-wrap gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
              {canCancel ? <OrderExceptionForm orderId={order.id} action={cancelOrder} label="Cancel" /> : null}
              {canFail ? <OrderExceptionForm orderId={order.id} action={failOrder} label="Flag failed" /> : null}
            </div>
          ) : null}
        </div>
      </div>

      <OrderMessageThread orderId={order.id} messages={messages} viewerRole="staff" />
    </div>
  );
}
