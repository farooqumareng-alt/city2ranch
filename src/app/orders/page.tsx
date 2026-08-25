import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Your City2Ranch City Pickup orders.",
};

export default async function OrdersPage() {
  // OrdersLayout already redirects a signed-out visitor, but this query
  // still needs the real user id to scope itself — never trust a shared
  // "you're allowed here" check to also mean "here's who you are."
  const user = await getCurrentUser();
  if (!user) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      storeName: stores.name,
    })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.authUserId, user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
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
          {rows.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-2 py-4 hover:bg-white/50"
            >
              <div>
                <p className="font-serif text-base text-navy-deep">{order.storeName}</p>
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
          ))}
        </div>
      )}
    </Container>
  );
}
