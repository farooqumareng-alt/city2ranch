import type { Metadata } from "next";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, serviceRequests } from "@/lib/db/schema";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "Concierge Quotes" };

export default async function ConciergeQueuePage() {
  const db = getDb();

  const [unconverted, conciergeOrders] = await Promise.all([
    db
      .select()
      .from(serviceRequests)
      .where(inArray(serviceRequests.status, ["new", "contacted"]))
      .orderBy(desc(serviceRequests.createdAt)),
    db
      .select()
      .from(orders)
      .where(inArray(orders.status, ["quote_pending", "priced"]))
      .orderBy(desc(orders.createdAt)),
  ]);

  const conciergeOnly = conciergeOrders.filter((o) => o.serviceType === "concierge");

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="STAFF"
          title="Concierge Quotes"
          description="Requests waiting to become a real order, and orders awaiting payment."
        />
        <Button href="/internal/dispatch/concierge/new" variant="navy">
          New Concierge Order
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">
          Unconverted Requests ({unconverted.length})
        </h3>
        {unconverted.length === 0 ? (
          <p className="font-sans text-sm text-charcoal/70">Nothing waiting.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
            {unconverted.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-serif text-base text-navy-deep">{req.name}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {req.email} · {req.phone} · {new Date(req.createdAt).toLocaleDateString()}
                    {req.requestedDeliveryDate
                      ? ` · Requested for ${formatPlainDate(req.requestedDeliveryDate)}`
                      : ""}
                  </p>
                  {req.referralSource ? (
                    <p className="font-sans text-xs font-medium text-gold">Referred by: {req.referralSource}</p>
                  ) : null}
                </div>
                <Button href={`/internal/dispatch/concierge/new?fromRequest=${req.id}`} variant="outline-dark">
                  Start Quote
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">
          Orders Awaiting Payment ({conciergeOnly.length})
        </h3>
        {conciergeOnly.length === 0 ? (
          <p className="font-sans text-sm text-charcoal/70">Nothing in progress.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
            {conciergeOnly.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  {/* Split from a whole-row link to the order (below) so
                      each destination is explicit — a nested <Link>
                      inside another isn't valid HTML. authUserId is
                      already on this row (a bare select() above), no
                      query change needed. */}
                  {order.authUserId ? (
                    <Link
                      href={`/internal/dispatch/admin/customers/${order.authUserId}`}
                      className="font-serif text-base text-navy-deep underline decoration-navy/20 hover:text-gold"
                    >
                      {order.customerName}
                    </Link>
                  ) : (
                    <p className="font-serif text-base text-navy-deep">{order.customerName}</p>
                  )}
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm text-charcoal/70">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  {order.totalCents > 0 ? (
                    <span className="font-sans text-sm font-medium text-navy-deep">
                      ${(order.totalCents / 100).toFixed(2)}
                    </span>
                  ) : null}
                  <Link
                    href={`/internal/dispatch/concierge/${order.id}`}
                    className="font-sans text-sm font-medium text-navy-deep underline decoration-navy/20 hover:text-gold"
                  >
                    View Quote →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
