import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores, drivers, orderDeliveryPins } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { approveAndPayOrder } from "@/lib/actions/approve-and-pay";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { getOrderItems, getOrderFeeLines } from "@/lib/orders/concierge";
import { getOrderTimeline } from "@/lib/audit-timeline";
import { ServiceTimeline } from "@/components/services/ServiceTimeline";
import { formatPlainDate } from "@/lib/format";
import { canPerform, getEffectiveOwnerWithRole } from "@/lib/household";
import { getOrderMessages } from "@/lib/order-messages";
import { OrderMessageThread } from "@/components/orders/OrderMessageThread";
import { resolvePickupAddress, formatPickupAddress } from "@/lib/orders/pickup-address";

export const metadata: Metadata = { title: "Service Details" };

/**
 * The unified Service Detail page from the approved UX blueprint —
 * replaces /orders/[id] (which now redirects here). One page for both
 * service types and every status, plus the Timeline (§Communication)
 * that used to have no customer-facing view at all despite audit_events
 * already recording every transition.
 */
export default async function ServiceDetailPage({
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
      pickupAddressLine1: orders.pickupAddressLine1,
      pickupAddressLine2: orders.pickupAddressLine2,
      pickupCity: orders.pickupCity,
      pickupState: orders.pickupState,
      pickupZip: orders.pickupZip,
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
      storeName: stores.name,
      storeAddressLine1: stores.addressLine1,
      storeCity: stores.city,
      storeState: stores.state,
      storeZip: stores.zip,
      driverName: drivers.name,
    })
    .from(orders)
    // leftJoin, not innerJoin: a concierge order has no storeId until
    // staff picks one while building the quote.
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .leftJoin(drivers, eq(orders.driverId, drivers.id))
    .where(eq(orders.id, id));

  const order = rows[0];

  // A household member (see src/lib/household.ts) can view the owner's
  // order exactly as the owner would.
  const { ownerId: effectiveOwnerId, role } = await getEffectiveOwnerWithRole(user.id);

  // Not found (wrong id) and not-yours (wrong owner) both 404 — an order
  // id belonging to someone else must never distinguish "doesn't exist"
  // from "exists but isn't yours."
  if (!order || order.authUserId !== effectiveOwnerId) notFound();

  const isConcierge = order.serviceType === "concierge";
  // The PIN lives in its own table now (see the doc comment on
  // orderDeliveryPins in schema.ts) — fetched only after the ownership
  // check above has already passed, same authorization boundary as
  // every other field on this page.
  const [items, feeLines, messages, pinRows, timeline] = await Promise.all([
    isConcierge ? getOrderItems(order.id) : Promise.resolve([]),
    isConcierge ? getOrderFeeLines(order.id) : Promise.resolve([]),
    getOrderMessages(order.id),
    db.select({ pin: orderDeliveryPins.pin }).from(orderDeliveryPins).where(eq(orderDeliveryPins.orderId, order.id)),
    getOrderTimeline(order.id),
  ]);
  const deliveryPin = pinRows[0]?.pin ?? null;
  const pickupAddress = resolvePickupAddress(order);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow={ORDER_STATUS_LABELS[order.status]}
        title={isConcierge ? "Concierge Shopping" : `Order from ${order.storeName}`}
        description={`Requested ${new Date(order.createdAt).toLocaleString()}`}
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
              {order.storeName}
              {pickupAddress ? ` — ${formatPickupAddress(pickupAddress)}` : ""}
            </p>
            {!pickupAddress ? (
              <p className="font-sans text-xs text-charcoal/50">
                We&apos;ll confirm the exact pickup address with you before a driver is assigned.
              </p>
            ) : null}
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
            {order.requestedDeliveryDate ? (
              <p className="mt-1 font-sans text-sm text-charcoal/70">
                Requested for: {formatPlainDate(order.requestedDeliveryDate)}
              </p>
            ) : null}
          </div>
          {/* Not shown at pending_acceptance — a driver has been
              offered the job but hasn't confirmed it yet (see
              src/lib/orders/status.ts), and could still decline and be
              reassigned. Naming them here first would be information
              that might change; the blueprint's own "customer sees no
              regression" principle argues for waiting until they're
              genuinely committed. */}
          {order.driverName && order.status !== "pending_acceptance" ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Your Driver</h3>
              <p className="font-sans text-sm text-charcoal/70">{order.driverName}</p>
            </div>
          ) : null}
          {deliveryPin ? (
            <div>
              <h3 className="font-serif text-lg text-navy-deep">Delivery PIN</h3>
              <p className="font-serif text-2xl tracking-widest text-gold">
                {deliveryPin}
              </p>
              <p className="font-sans text-xs text-charcoal/60">
                Give this to your driver at delivery to confirm it&apos;s you.
              </p>
            </div>
          ) : null}
          <ServiceTimeline entries={timeline} />
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

          {order.status === "priced" && canPerform(role, "pay") ? (
            <>
              <p className="font-sans text-xs text-charcoal/60">
                Final pricing confirmed before service begins.
              </p>
              <JobActionButton
                action={approveAndPayOrder.bind(null, order.id)}
                label="Approve & Pay"
                pendingLabel="Approving…"
                variant="gold"
                size="md"
              />
            </>
          ) : order.status === "priced" ? (
            <p className="font-sans text-sm text-charcoal/70">
              Final pricing confirmed — ask the account owner to approve and pay.
            </p>
          ) : (
            <p className="font-sans text-sm text-charcoal/70">
              Status: {ORDER_STATUS_LABELS[order.status]}
            </p>
          )}
        </div>
      </div>

      <OrderMessageThread orderId={order.id} messages={messages} viewerRole="customer" />
    </div>
  );
}
