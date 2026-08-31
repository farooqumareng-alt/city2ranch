import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/lib/db";
import { orders, stores, memberships, orderDeliveryPins } from "@/lib/db/schema";
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
async function upsertMembershipFromSubscription(subscription: Stripe.Subscription, eventCreated: number) {
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
  const eventCreatedAt = new Date(eventCreated * 1000);
  const values = {
    authUserId,
    tier,
    status: toMembershipStatus(subscription.status),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
    stripeEventCreatedAt: eventCreatedAt,
  };

  // Stripe doesn't guarantee delivery order and retries failed
  // deliveries for up to 3 days — without this guard, a stale/
  // out-of-order redelivery could silently overwrite a newer status
  // (e.g. resurrecting a canceled membership with a late-arriving
  // "active" event from before the cancellation). The predicate makes
  // an older event's write a no-op instead: only overwrite when this
  // row has never been written by an event, or the new event is
  // strictly newer than the one that last wrote it.
  await db
    .insert(memberships)
    .values(values)
    .onConflictDoUpdate({
      target: memberships.authUserId,
      set: { ...values, updatedAt: new Date() },
      setWhere: sql`${memberships.stripeEventCreatedAt} IS NULL OR ${memberships.stripeEventCreatedAt} < ${eventCreatedAt}`,
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
    // a stale one) is a safe no-op, not a re-processing. The status
    // predicate is repeated in the UPDATE's own WHERE (not just this
    // `if`) so the read-then-write isn't a bare TOCTOU race: if a
    // concurrent request already moved the order off payment_pending
    // between the read above and this write, `updated` comes back
    // empty and nothing further executes for this delivery.
    if (order.status === "payment_pending") {
      assertTransition(order.status, "paid");
      const deliveryPin = generatePin();
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const updated = await db
        .update(orders)
        .set({
          status: "paid",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, order.id), eq(orders.status, "payment_pending")))
        .returning({ id: orders.id });

      if (updated.length === 0) {
        console.error(
          `[stripe webhook] order ${order.id} changed status between read and write — skipping duplicate/racing completed event`
        );
        return NextResponse.json({ received: true });
      }

      // Delivery PIN lives in its own table, not on `orders` — see the
      // doc comment on orderDeliveryPins in schema.ts. onConflictDoUpdate
      // makes this safe even if a PIN somehow already exists for this
      // order (it shouldn't, given the CAS above, but a fresh PIN is
      // harmless either way since none has been read by a driver yet).
      await db
        .insert(orderDeliveryPins)
        .values({ orderId: order.id, pin: deliveryPin })
        .onConflictDoUpdate({ target: orderDeliveryPins.orderId, set: { pin: deliveryPin } });

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
            orderUrl: `${siteUrl}/my-services/${order.id}`,
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
    } else {
      // Previously silent — a completed event arriving when the order
      // isn't payment_pending (e.g. a stale expiry reverted it to
      // priced underneath a still-live, later session — see the
      // session-id check added below) meant money could be taken with
      // zero record anywhere. This doesn't recover the order
      // automatically (that would need its own reasoning about which
      // session is authoritative), but it guarantees the situation is
      // never invisible.
      console.error(
        `[stripe webhook] checkout.session.completed for order ${order.id} (session ${session.id}) but order status is "${order.status}", not "payment_pending" — payment may need manual reconciliation`
      );
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const rows = await db.select().from(orders).where(eq(orders.id, orderId));
      const order = rows[0];
      // Also require this to be the order's *current* checkout session
      // — without it, an independently-retried expiry for an earlier,
      // already-superseded session could revert an order that has since
      // moved on to a new, still-live session (see the double-checkout
      // finding in approve-and-pay.ts). The status check alone isn't
      // enough once two sessions can exist for the same order.
      if (order && order.status === "payment_pending" && order.stripeCheckoutSessionId === session.id) {
        assertTransition(order.status, "priced");
        const updated = await db
          .update(orders)
          .set({ status: "priced", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), eq(orders.status, "payment_pending")))
          .returning({ id: orders.id });
        if (updated.length === 0) {
          console.error(`[stripe webhook] order ${order.id} changed status before expiry could be applied — skipping`);
          return NextResponse.json({ received: true });
        }

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
    await upsertMembershipFromSubscription(event.data.object as Stripe.Subscription, event.created);
  }

  return NextResponse.json({ received: true });
}
