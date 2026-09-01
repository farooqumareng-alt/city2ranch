import { and, eq, lte } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { orderItems, orders, recurringServicePlanItems, recurringServicePlans } from "@/lib/db/schema";
import { getZipMileage } from "@/lib/pricing/repository";
import { advanceNextRunAt } from "@/lib/recurring-services/schedule";
import { getResend } from "@/lib/email/resend";
import { recurringOrderCreatedEmail } from "@/lib/email/templates";
import { shouldNotify } from "@/lib/notifications/should-send";
import { createNotification } from "@/lib/notifications/create";

/**
 * Invoked by Vercel Cron (see vercel.json) on a schedule, not by any
 * user action — this is the only place in the codebase that runs
 * unattended. Spawns a new concierge order (see
 * src/lib/db/schema.ts's doc comment on recurringServicePlans for why
 * only concierge, never City Pickup) for every plan whose nextRunAt has
 * arrived, reusing the exact insert shape
 * src/lib/actions/create-concierge-order.ts uses for a staff-created
 * order — same status ("quote_pending"), same totalCents (0, priced by
 * staff afterward) — so a spawned order is indistinguishable from a
 * manually-created one anywhere downstream.
 *
 * Deliberately does NOT charge anything — see the doc comment on
 * cancelMembership/subscribeMembership's neighbors for the parallel
 * reasoning: there's no saved-payment-method infrastructure, so every
 * spawned order still needs an explicit Approve & Pay from the
 * customer, exactly like a manually-placed order.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  // Fail closed: an unset secret must never mean "open." A blank/missing
  // Authorization header on a manually-crafted request must never pass
  // just because CRON_SECRET happens to be unset in this environment.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const duePlans = await db
    .select()
    .from(recurringServicePlans)
    .where(and(eq(recurringServicePlans.status, "active"), lte(recurringServicePlans.nextRunAt, new Date())));

  let spawned = 0;
  let skipped = 0;

  // Sequential, not Promise.all — at realistic near-term volume this is
  // a handful of plans per run, and each spawn is its own multi-insert
  // transaction. Batch this only if real volume ever makes it the
  // bottleneck; premature concurrency here just risks tripping the DB
  // pool's max:5 headroom (src/lib/db/index.ts) for no real benefit yet.
  for (const plan of duePlans) {
    try {
      // Re-checked every run, not just at plan creation — route data
      // could theoretically be removed after a plan was set up.
      const roundTripMiles = await getZipMileage(plan.deliveryZip);
      if (roundTripMiles == null) {
        console.error(
          `[recurring-services cron] plan ${plan.id} has no route data for ZIP ${plan.deliveryZip}, skipping this cycle`
        );
        // Still advance nextRunAt — otherwise a permanently-broken plan
        // would retry (and log the same error) every single cron tick
        // forever instead of just once per its actual schedule.
        await db
          .update(recurringServicePlans)
          .set({ nextRunAt: advanceNextRunAt(plan.nextRunAt, plan.frequency), updatedAt: new Date() })
          .where(eq(recurringServicePlans.id, plan.id));
        skipped++;
        continue;
      }

      const items = await db
        .select()
        .from(recurringServicePlanItems)
        .where(eq(recurringServicePlanItems.planId, plan.id));

      const orderId = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            authUserId: plan.authUserId,
            serviceType: "concierge",
            customerName: plan.customerName,
            customerEmail: plan.customerEmail,
            customerPhone: plan.customerPhone,
            deliveryAddressLine1: plan.deliveryAddressLine1,
            deliveryAddressLine2: plan.deliveryAddressLine2,
            deliveryCity: plan.deliveryCity,
            deliveryState: plan.deliveryState,
            deliveryZip: plan.deliveryZip,
            customerNotes: plan.customerNotes,
            status: "quote_pending",
            serviceLabel: "City2Ranch Concierge Shopping & Delivery",
            totalCents: 0,
          })
          .returning({ id: orders.id });

        if (items.length > 0) {
          await tx.insert(orderItems).values(
            items.map((item, index) => ({
              orderId: order.id,
              itemName: item.itemName,
              quantity: item.quantity,
              notes: item.notes,
              sortOrder: index,
            }))
          );
        }

        // Advance from the plan's own scheduled nextRunAt, not from
        // "now" — see advanceNextRunAt's doc comment.
        await tx
          .update(recurringServicePlans)
          .set({ nextRunAt: advanceNextRunAt(plan.nextRunAt, plan.frequency), updatedAt: new Date() })
          .where(eq(recurringServicePlans.id, plan.id));

        return order.id;
      });

      spawned++;

      // The in-app bell record is unconditional — independent of the
      // recurringOrderCreated email preference below, same reasoning as
      // the payment-confirmed notification in the Stripe webhook.
      await createNotification({
        authUserId: plan.authUserId,
        type: "recurring_order_created",
        title: "New order from your recurring request",
        body: "Review your shopping list and approve it before it's charged.",
        orderId,
      });

      // Best-effort, non-blocking — same pattern as every other
      // transactional email in this app. A failed notification never
      // undoes the order that was just created.
      if (await shouldNotify(plan.authUserId, "recurringOrderCreated")) {
        try {
          const resend = getResend();
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
          const { subject, html } = recurringOrderCreatedEmail({ orderUrl: `${siteUrl}/my-services/${orderId}` });
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
            to: plan.customerEmail,
            subject,
            html,
          });
        } catch (error) {
          console.error(`[recurring-services cron] confirmation email failed for plan ${plan.id}`, error);
        }
      }
    } catch (error) {
      // One plan failing to spawn must never take down the rest of the
      // run — log and move on, the next tick will retry it (nextRunAt
      // wasn't advanced for this plan since the failure happened before
      // that update).
      console.error(`[recurring-services cron] failed to spawn an order for plan ${plan.id}`, error);
    }
  }

  return NextResponse.json({ due: duePlans.length, spawned, skipped });
}
