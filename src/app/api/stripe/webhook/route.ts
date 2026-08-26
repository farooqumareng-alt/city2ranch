import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/server";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getResend } from "@/lib/email/resend";
import { orderPaymentConfirmedEmail } from "@/lib/email/templates";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // Signature verification needs the raw, unparsed body — must read via
  // .text() before anything else touches the request.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = getDb();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error("[stripe webhook] checkout.session.completed missing orderId metadata");
      return NextResponse.json({ received: true });
    }

    const rows = await db
      .select({ order: orders, storeName: stores.name })
      .from(orders)
      // leftJoin: a concierge order may have no store at all.
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(eq(orders.id, orderId));
    const row = rows[0];
    if (!row) {
      console.error(`[stripe webhook] order ${orderId} not found`);
      return NextResponse.json({ received: true });
    }
    const { order, storeName } = row;

    // Idempotency: Stripe redelivers events. Only act if the order is
    // still where we left it — a second delivery of the same event (or
    // a stale one) is a safe no-op, not a re-processing.
    if (order.status === "payment_pending") {
      assertTransition(order.status, "paid");
      const deliveryPin = generatePin();
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      await db
        .update(orders)
        .set({
          status: "paid",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
          deliveryPin,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await logAuditEvent({
        orderId: order.id,
        actorType: "system",
        action: "payment_succeeded",
        previousState: "payment_pending",
        newState: "paid",
        metadata: { stripePaymentIntentId: paymentIntentId },
      });

      try {
        const resend = getResend();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const { subject, html } = orderPaymentConfirmedEmail({
          storeName,
          totalCents: order.totalCents,
          deliveryPin,
          orderUrl: `${siteUrl}/orders/${order.id}`,
        });
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
          to: order.customerEmail,
          subject,
          html,
        });
      } catch (error) {
        console.error("[stripe webhook] confirmation email failed", error);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const rows = await db.select().from(orders).where(eq(orders.id, orderId));
      const order = rows[0];
      if (order && order.status === "payment_pending") {
        assertTransition(order.status, "priced");
        await db
          .update(orders)
          .set({ status: "priced", updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await logAuditEvent({
          orderId: order.id,
          actorType: "system",
          action: "checkout_expired",
          previousState: "payment_pending",
          newState: "priced",
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
