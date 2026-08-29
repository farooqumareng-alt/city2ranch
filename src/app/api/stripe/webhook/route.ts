import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/db";
import { orders, stores, memberships } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/server";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getResend } from "@/lib/email/resend";
import { orderPaymentConfirmedEmail } from "@/lib/email/templates";
import { shouldNotify } from "@/lib/notifications/should-send";
import { getMembershipTierForPriceId, type MembershipTier } from "@/lib/stripe/tiers";
import { toMembershipStatus } from "@/lib/stripe/membership-status";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Shared by customer.subscription.created/updated/deleted — a
 *  cancellation is just another status on the same object (Stripe
 *  reports status "canceled" on the same Subscription, it doesn't send
 *  a fundamentally different payload), so one upsert handles all three
 *  event types identically. */
async function upsertMembershipFromSubscription(subscription: Stripe.Subscription) {
  const authUserId = subscription.metadata?.authUserId;
  if (!authUserId) {
    console.error(`[stripe webhook] subscription ${subscription.id} missing authUserId metadata`);
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  if (!priceId) {
    console.error(`[stripe webhook] subscription ${subscription.id} has no price`);
    return;
  }

  // Set at checkout (subscription_data.metadata — see subscribeMembership
  // in src/lib/actions/membership.ts) and persisted on the Subscription
  // for its whole lifetime, so this is available on every later event
  // too, not just the first. Falls back to a reverse price-id lookup
  // for a subscription created outside that flow (e.g. directly in the
  // Stripe dashboard while testing).
  const tier = (subscription.metadata?.tier as MembershipTier | undefined) ?? getMembershipTierForPriceId(priceId);
  if (!tier) {
    console.error(`[stripe webhook] subscription ${subscription.id} has no resolvable membership tier`);
    return;
  }

  const db = getDb();
  const values = {
    authUserId,
    tier,
    status: toMembershipStatus(subscription.status),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
  };

  await db
    .insert(memberships)
    .values(values)
    .onConflictDoUpdate({
      target: memberships.authUserId,
      set: { ...values, updatedAt: new Date() },
    });
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

  // mode: "subscription" checkouts (Membership) also fire this event,
  // but they carry no orderId — customer.subscription.created below is
  // what actually records a new membership, so skip silently here
  // rather than logging a false-positive "missing orderId" error.
  if (event.type === "checkout.session.completed" && (event.data.object as Stripe.Checkout.Session).mode === "payment") {
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

      // order.authUserId should always be set by now — approveAndPayOrder
      // (the only path to payment_pending) requires it — but if it's ever
      // absent there's no preference row to check against, so default to
      // sending rather than silently dropping a payment confirmation.
      const wantsReceipt = order.authUserId
        ? await shouldNotify(order.authUserId, "paymentReceipts")
        : true;

      if (wantsReceipt) {
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

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await upsertMembershipFromSubscription(event.data.object as Stripe.Subscription);
  }

  return NextResponse.json({ received: true });
}
