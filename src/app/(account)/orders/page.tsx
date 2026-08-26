import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { claimOrder } from "@/lib/actions/claim-order";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Your City2Ranch orders.",
};

export default async function OrdersPage() {
  // OrdersLayout already redirects a signed-out visitor, but this query
  // still needs the real user id to scope itself — never trust a shared
  // "you're allowed here" check to also mean "here's who you are."
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      storeName: stores.name,
      authUserId: orders.authUserId,
    })
    .from(orders)
    // leftJoin, not innerJoin: a concierge order has no storeId until
    // staff picks one while building the quote.
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(
      or(
        eq(orders.authUserId, user.id),
        // A staff-created concierge order starts with no owner (see
        // claim-order.ts) — surfaced here by email match so the customer
        // can claim it, but not otherwise viewable (the detail page and
        // Approve & Pay both still require an exact authUserId match).
        and(isNull(orders.authUserId), sql`lower(${orders.customerEmail}) = lower(${user.email})`)
      )
    )
    .orderBy(desc(orders.createdAt));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow="YOUR ACCOUNT" title="My Orders" />
        <Button href="/orders/new" variant="navy">
          Request a Pickup
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          You don&apos;t have any orders yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {rows.map((order) =>
            order.authUserId ? (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-4 hover:bg-white/50"
              >
                <div>
                  <p className="font-serif text-base text-navy-deep">
                    {order.storeName ?? "Concierge Request"}
                  </p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm text-charcoal/70">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="font-sans text-sm font-medium text-navy-deep">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </Link>
            ) : (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-serif text-base text-navy-deep">Concierge Request</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(order.createdAt).toLocaleDateString()} · {ORDER_STATUS_LABELS[order.status]}
                  </p>
                </div>
                <form action={claimOrder.bind(null, order.id)}>
                  <Button type="submit" variant="outline-dark" size="md">
                    This is my order
                  </Button>
                </form>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
