import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { ReportProblemForm } from "@/components/driver/ReportProblemForm";
import { ConfirmDeliveryForm } from "@/components/driver/ConfirmDeliveryForm";
import { AcceptDeclineButtons } from "@/components/driver/AcceptDeclineButtons";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { acceptJob, declineJob } from "@/lib/actions/driver-accept-decline";
import { markPickedUp } from "@/lib/actions/driver-mark-picked-up";
import { markInTransit } from "@/lib/actions/driver-mark-in-transit";
import { getOrderItems } from "@/lib/orders/concierge";
import { formatPlainDate } from "@/lib/format";
import { mapsUrl } from "@/lib/maps";
import { resolvePickupAddress, formatPickupAddress } from "@/lib/orders/pickup-address";

export const metadata: Metadata = { title: "Job Detail" };

/**
 * The one job-at-a-time screen the rest of the driver flow lives on —
 * exactly one primary action based on status, so there's never a
 * question of what to do next. 404s (not a distinguishable error) the
 * same way every driver action already fails closed — scoped by
 * eq(orders.driverId, driver.id), never trusting the id in the URL
 * alone.
 */
export default async function DriverJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const driver = await requireDriver();
  const { id } = await params;

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      serviceType: orders.serviceType,
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
      customerNotes: orders.customerNotes,
      requestedDeliveryDate: orders.requestedDeliveryDate,
      storeName: stores.name,
      storeAddressLine1: stores.addressLine1,
      storeCity: stores.city,
      storeState: stores.state,
      storeZip: stores.zip,
    })
    .from(orders)
    // leftJoin: a concierge order may have no store at all.
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(and(eq(orders.id, id), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) notFound();

  const items = order.serviceType === "concierge" ? await getOrderItems(order.id) : [];
  const pickupAddress = resolvePickupAddress(order);

  const deliveryMapsUrl = mapsUrl(
    order.deliveryAddressLine1,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryZip
  );
  const pickupMapsUrl =
    order.serviceType === "pickup" && pickupAddress
      ? mapsUrl(pickupAddress.addressLine1, pickupAddress.city, pickupAddress.state, pickupAddress.zip)
      : null;

  const isTerminal = order.status === "completed" || order.status === "failed";

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="DRIVER"
          title={order.serviceType === "concierge" ? "Concierge Order" : `Pickup: ${order.storeName}`}
          description={
            order.retailerOrderNumber ? `Order #${order.retailerOrderNumber}` : "Job details and next step."
          }
        />
        <StatusBadge status={order.status} />
      </div>

      {order.status === "pending_acceptance" ? (
        <div className="rounded-sm border border-gold/40 bg-gold/10 p-4">
          <p className="font-sans text-sm text-navy-deep">
            You&apos;ve been offered this job. Accept it to start working it, or decline to send it back.
          </p>
        </div>
      ) : null}

      {order.serviceType === "concierge" && order.pickupNotes ? (
        <p className="font-sans text-sm text-charcoal/70">{order.pickupNotes}</p>
      ) : null}

      {order.status !== "pending_acceptance" && order.serviceType === "pickup" ? (
        <div>
          <h3 className="font-serif text-lg text-navy-deep">Pickup</h3>
          <p className="font-sans text-sm text-charcoal/70">
            {pickupAddress ? formatPickupAddress(pickupAddress) : "No pickup address on file — contact dispatch."}
          </p>
          {order.status === "driver_assigned" && pickupMapsUrl ? (
            <a
              href={pickupMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-sans text-sm font-medium text-gold underline decoration-gold/40 hover:text-gold-light"
            >
              Navigate to pickup →
            </a>
          ) : null}
        </div>
      ) : null}

      {order.serviceType === "concierge" && items.length > 0 ? (
        <div>
          <h3 className="font-serif text-lg text-navy-deep">Shopping List</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id} className="font-sans text-sm text-charcoal/70">
                {item.itemName} <span className="text-charcoal/50">— {item.quantity}</span>
                {item.notes ? <span className="text-charcoal/50"> ({item.notes})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="font-serif text-lg text-navy-deep">Deliver to</h3>
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
        {/* Shown once picked up, not just in_transit-only per the
            original brief's diagram — a driver already en route still
            benefits from a re-routable link, not just at the moment
            they depart. */}
        {order.status === "picked_up" || order.status === "in_transit" ? (
          <a
            href={deliveryMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block font-sans text-sm font-medium text-gold underline decoration-gold/40 hover:text-gold-light"
          >
            Navigate to delivery →
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-t border-navy/10 pt-6">
        {order.status === "pending_acceptance" ? (
          <AcceptDeclineButtons onAccept={acceptJob.bind(null, order.id)} onDecline={declineJob.bind(null, order.id)} />
        ) : null}
        {order.status === "driver_assigned" ? (
          <JobActionButton action={markPickedUp.bind(null, order.id)} label="Confirm Pickup" pendingLabel="Saving…" />
        ) : null}
        {order.status === "picked_up" ? (
          <JobActionButton action={markInTransit.bind(null, order.id)} label="On My Way" pendingLabel="Saving…" />
        ) : null}
        {order.status === "in_transit" ? <ConfirmDeliveryForm orderId={order.id} /> : null}
        {order.status === "completed" ? (
          <p className="font-sans text-sm font-medium text-navy-deep">Delivered — confirmed.</p>
        ) : null}
        {order.status === "failed" ? (
          <p className="font-sans text-sm font-medium text-charcoal/70">This job was flagged and is closed.</p>
        ) : null}
        {/* Not shown before acceptance — Decline is the right action for
            "I can't/won't do this job" at that stage, before any work
            has actually started. */}
        {!isTerminal && order.status !== "pending_acceptance" ? <ReportProblemForm orderId={order.id} /> : null}
      </div>
    </div>
  );
}
