"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { paymentServicesConfigured } from "@/lib/env";

/**
 * Bound to the "Approve & Pay" form as
 * `approveAndPayOrder.bind(null, order.id)` — the extra leading arg is
 * the Next.js convention for passing data to a server action from a
 * plain <form action={...}>, not useActionState.
 */
export async function approveAndPayOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (!paymentServicesConfigured()) {
    // Nothing changed — the order stays "priced" and the customer can
    // retry once payment is configured, same honest-degradation pattern
    // as every other form action in this app.
    redirect(`/orders/${orderId}`);
  }

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];

  if (!order || order.authUserId !== user.id) redirect("/orders");

  // Already progressed (e.g. a double-click) — idempotent no-op back to
  // the same page rather than erroring.
  if (order.status !== "priced") redirect(`/orders/${orderId}`);
  assertTransition(order.status, "payment_pending");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: order.currency,
          product_data: {
            name:
              order.serviceType === "concierge"
                ? "City2Ranch Concierge Shopping & Delivery"
                : "City2Ranch pickup & delivery",
          },
          unit_amount: order.totalCents,
        },
        quantity: 1,
      },
    ],
    customer_email: user.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    success_url: `${siteUrl}/orders/${order.id}?paid=1`,
    cancel_url: `${siteUrl}/orders/${order.id}`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL");
  }

  await db
    .update(orders)
    .set({
      status: "payment_pending",
      stripeCheckoutSessionId: session.id,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await logAuditEvent({
    orderId: order.id,
    actorType: "customer",
    actorId: user.id,
    action: "checkout_started",
    previousState: "priced",
    newState: "payment_pending",
    metadata: { stripeCheckoutSessionId: session.id },
  });

  redirect(session.url);
}
