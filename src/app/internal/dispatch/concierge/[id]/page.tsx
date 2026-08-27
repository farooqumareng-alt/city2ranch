import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ConciergeQuoteForm } from "@/components/dispatch/ConciergeQuoteForm";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getOrderItems, getOrderFeeLines } from "@/lib/orders/concierge";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "Concierge Quote" };

export default async function ConciergeQuoteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const rows = await db.select().from(orders).where(eq(orders.id, id));
  const order = rows[0];
  if (!order || order.serviceType !== "concierge") notFound();

  const [items, feeLines] = await Promise.all([getOrderItems(id), getOrderFeeLines(id)]);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow={ORDER_STATUS_LABELS[order.status]}
        title={`Concierge Order — ${order.customerName}`}
        description={`${order.deliveryAddressLine1}, ${order.deliveryCity}, ${order.deliveryState} ${order.deliveryZip} · ${order.customerPhone} · ${order.customerEmail}${
          order.requestedDeliveryDate
            ? ` · Requested for ${formatPlainDate(order.requestedDeliveryDate)}`
            : ""
        }`}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="font-serif text-lg text-navy-deep">Shopping List</h3>
          {items.length === 0 ? (
            <p className="font-sans text-sm text-charcoal/70">No items recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-sm border border-navy/10 bg-white/60 p-3">
                  <p className="font-sans text-sm text-navy-deep">
                    {item.itemName} <span className="text-charcoal/60">— {item.quantity}</span>
                  </p>
                  {item.notes ? (
                    <p className="font-sans text-xs text-charcoal/60">{item.notes}</p>
                  ) : null}
                  {item.substitutionNote ? (
                    <p className="font-sans text-xs text-gold">
                      {item.status}: {item.substitutionNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {order.customerNotes ? (
            <div>
              <h4 className="font-serif text-base text-navy-deep">Notes</h4>
              <p className="font-sans text-sm text-charcoal/70">{order.customerNotes}</p>
            </div>
          ) : null}
        </div>

        <ConciergeQuoteForm
          orderId={order.id}
          status={order.status}
          existingFeeLines={feeLines.map((l) => ({ label: l.label, amountCents: l.amountCents }))}
        />
      </div>
    </div>
  );
}
