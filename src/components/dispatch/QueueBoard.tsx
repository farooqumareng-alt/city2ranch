"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { canTransition, type OrderStatus } from "@/lib/orders/status";
import { cancelOrder, failOrder } from "@/lib/actions/staff-order-exceptions";
import { AssignDriverForm } from "@/components/dispatch/AssignDriverForm";
import { OrderExceptionForm } from "@/components/dispatch/OrderExceptionForm";
import { formatPlainDate } from "@/lib/format";

export type QueueOrder = {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  serviceType: "pickup" | "concierge";
  authUserId: string | null;
  customerName: string;
  customerPhone: string | null;
  retailerOrderNumber: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  requestedDeliveryDate: string | null;
  totalCents: number;
  storeName: string | null;
  driverName: string | null;
};

// Fulfillment order, not alphabetical — matches how a job actually
// moves through the queue. "paid" is relabeled "Awaiting Driver" here
// since that's the actual work item at this stage, not just its status.
const STATUS_SECTIONS: { status: OrderStatus; heading: string }[] = [
  { status: "paid", heading: "Awaiting Driver" },
  { status: "driver_assigned", heading: "Driver Assigned" },
  { status: "picked_up", heading: "Picked Up" },
  { status: "in_transit", heading: "In Transit" },
];

const SERVICE_TYPE_OPTIONS = [
  { value: "all", label: "All Service Types" },
  { value: "pickup", label: "City Pickup" },
  { value: "concierge", label: "Concierge" },
];

function matchesSearch(order: QueueOrder, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    order.customerName.toLowerCase().includes(q) ||
    (order.customerPhone?.toLowerCase().includes(q) ?? false) ||
    (order.retailerOrderNumber?.toLowerCase().includes(q) ?? false) ||
    (order.driverName?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Client-side search/filter/grouping over an already-fetched, already-
 * small dataset (the dispatch queue's four active statuses) — not a new
 * DB search pattern. Real cross-entity search across the whole app is a
 * separate, later feature; this is scoped to narrowing what's already
 * on screen.
 */
export function QueueBoard({
  orders,
  driverOptions,
}: {
  orders: QueueOrder[];
  driverOptions: { value: string; label: string }[];
}) {
  const [query, setQuery] = useState("");
  const [serviceType, setServiceType] = useState("all");

  const isFiltering = query.trim().length > 0 || serviceType !== "all";

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesSearch(order, query.trim()) &&
          (serviceType === "all" || order.serviceType === serviceType)
      ),
    [orders, query, serviceType]
  );

  const sections = STATUS_SECTIONS.map((section) => ({
    ...section,
    orders: filtered.filter((order) => order.status === section.status),
  })).filter((section) => section.orders.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Plain controlled elements, not TextField/SelectField — those
          are built for name/id-based form submission (SelectField in
          particular hardcodes defaultValue="", which conflicts with a
          controlled `value` prop and trips React's controlled/
          uncontrolled warning). This is live client-side filter state,
          not a submitted form, so it doesn't need that machinery —
          just their matching visual styling. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5 sm:min-w-70">
          <label htmlFor="queue-search" className="font-sans text-sm font-medium text-navy-deep">
            Search
          </label>
          <input
            id="queue-search"
            type="text"
            placeholder="Customer, phone, order #, or driver"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:min-w-55">
          <label htmlFor="queue-service-type" className="font-sans text-sm font-medium text-navy-deep">
            Service Type
          </label>
          <select
            id="queue-service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
          >
            {SERVICE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          message={
            isFiltering
              ? "No orders match your search."
              : "Nothing needs attention right now."
          }
        />
      ) : (
        sections.map((section) => (
          <section key={section.status} className="flex flex-col gap-4">
            <h3 className="font-serif text-lg text-navy-deep">
              {section.heading}{" "}
              <span className="font-sans text-sm font-normal text-charcoal/50">({section.orders.length})</span>
            </h3>
            <div className="flex flex-col gap-6">
              {section.orders.map((order) => {
                const canCancel = canTransition(order.status, "cancelled");
                const canFail = canTransition(order.status, "failed");
                return (
                  <Card key={order.id} className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-lg text-navy-deep">
                          {order.authUserId ? (
                            <Link
                              href={`/internal/dispatch/admin/customers/${order.authUserId}`}
                              className="underline decoration-navy-deep/20 hover:text-gold"
                            >
                              {order.customerName}
                            </Link>
                          ) : (
                            order.customerName
                          )}{" "}
                          — {order.storeName ?? "Concierge"}
                        </p>
                        <p className="font-sans text-xs text-charcoal/60">
                          {order.retailerOrderNumber ? `Order #${order.retailerOrderNumber} · ` : ""}
                          {order.deliveryCity}, {order.deliveryState} {order.deliveryZip} ·{" "}
                          {order.customerPhone}
                        </p>
                        <p className="font-sans text-xs text-charcoal/60">
                          Placed {new Date(order.createdAt).toLocaleString()}
                          {order.requestedDeliveryDate
                            ? ` · Requested for ${formatPlainDate(order.requestedDeliveryDate)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={order.status} />
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
                        <OrderExceptionForm orderId={order.id} action={cancelOrder} label="Cancel" />
                      ) : null}
                      {canFail ? (
                        <OrderExceptionForm orderId={order.id} action={failOrder} label="Flag failed" />
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
