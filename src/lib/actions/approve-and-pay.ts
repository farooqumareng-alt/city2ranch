"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { paymentServicesConfigured } from "@/lib/env";
import { canPerform, getEffectiveOwnerWithRole } from "@/lib/household";
import type { ActionResult } from "@/lib/actions/types";

/**
 * Bound to the "Approve & Pay" form as
 * `approveAndPayOrder.bind(null, order.id)` — the extra leading arg is
 * the Next.js convention for currying data into a server action, same
 * as markPickedUp.bind(null, order.id) elsewhere. The bound result is
 * used with useActionState (via JobActionButton) purely so the button
 * can disable itself while pending — a double-click used to be able to
 * create two live Stripe Checkout Sessions for the same order, since
 * nothing stopped a second submission from starting before the first's
 * response landed.
 */
export async function approveAndPayOrder(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention, unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
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

  // A household member (see src/lib/household.ts) can approve and pay
  // for the owner's order exactly as if they were the owner — this is
  // the one check in the whole app where that distinction is real money,
  // so it goes through the same resolver every other ownership check
  // uses, not a one-off.
  const { ownerId: effectiveOwnerId, role } = await getEffectiveOwnerWithRole(user.id);
  if (!order || order.authUserId !== effectiveOwnerId) redirect("/orders");

  // The order page already hides this form for a role that can't pay
  // (see orders/[id]/page.tsx) — re-checked here regardless, since a
  // form action must never trust that the UI alone kept someone out.
  if (!canPerform(role, "pay")) redirect(`/orders/${orderId}`);

  // Already progressed (e.g. a double-click, or a race with the
  // compare-and-swap below losing) — idempotent no-op back to the same
  // page rather than erroring. This check alone doesn't prevent the
  // race (see the real guard on the UPDATE below); it's just the fast
  // path for the common non-concurrent case.
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

  // Compare-and-swap: the Stripe session above is already created by
  // this point (Stripe has no "reserve the update" step), so a losing
  // request here has already produced one orphaned, uncompleted
  // Checkout Session — that's an acceptable cost, since it will simply
  // expire unused. What this guard actually prevents is the order's own
  // stripeCheckoutSessionId ending up pointed at whichever request
  // happened to write last, silently orphaning the *other* session
  // instead of ever being told two were created.
  const updated = await db
    .update(orders)
    .set({
      status: "payment_pending",
      stripeCheckoutSessionId: session.id,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, order.id), eq(orders.status, "priced")))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: "This order was already updated — refresh the page and try again.",
    };
  }

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
