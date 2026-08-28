import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";

export const metadata: Metadata = {
  title: "Payments",
  description: "Your City2Ranch billing history.",
};

// Billing history only — real, derived directly from orders.paidAt/
// totalCents, which already exist. Deliberately no "Payment Methods"
// section: Stripe Checkout is one-off per order today, there's no
// saved-card/Stripe Customer object anywhere in this app, so a saved-
// cards UI would have nothing real behind it. "Receipt" links to the
// order detail page itself (already shows the full price/quote
// breakdown) rather than a separate PDF generator that doesn't exist.
export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  const rows = await db
    .select({
      id: orders.id,
      serviceType: orders.serviceType,
      totalCents: orders.totalCents,
      paidAt: orders.paidAt,
      storeName: stores.name,
    })
    .from(orders)
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .where(and(eq(orders.authUserId, ownerId), isNotNull(orders.paidAt)))
    .orderBy(desc(orders.paidAt));

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="YOUR ACCOUNT" title="Payments" description="Your City2Ranch billing history." />

      {rows.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">No payments yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-serif text-base text-navy-deep">
                  {row.serviceType === "concierge" ? "Concierge Order" : (row.storeName ?? "Order")}
                </p>
                <p className="font-sans text-xs text-charcoal/60">
                  {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-sans text-sm font-medium text-navy-deep">
                  ${(row.totalCents / 100).toFixed(2)}
                </span>
                <Link
                  href={`/orders/${row.id}`}
                  className="font-sans text-sm text-navy-deep underline decoration-gold/50 underline-offset-4 hover:text-gold"
                >
                  View Receipt
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
