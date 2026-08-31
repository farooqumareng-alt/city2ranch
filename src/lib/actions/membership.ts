"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { customerProfiles, memberships } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getMembershipPriceId, type MembershipTier } from "@/lib/stripe/tiers";
import { membershipServicesConfigured } from "@/lib/env";
import { canPerform, getEffectiveOwner } from "@/lib/household";
import { getMembershipSettings } from "@/lib/actions/membership-settings";

// Deliberately not using src/lib/audit.ts's logAuditEvent here —
// audit_events is order-scoped (a NOT NULL FK to orders.id), and a
// membership subscribe/cancel isn't tied to one. Stripe's own dashboard
// is the audit trail for subscription lifecycle events; this file logs
// failures to the console like every other best-effort integration
// call in this codebase.

/** Used by /membership to decide whether to show real pricing/checkout
 *  or the existing static lead-capture cards. */
export async function getOwnMembership(authUserId: string) {
  const db = getDb();
  const rows = await db.select().from(memberships).where(eq(memberships.authUserId, authUserId));
  return rows[0] ?? null;
}

/**
 * Bound to a "Subscribe" form as `subscribeMembership.bind(null, tier)`
 * — same leading-bound-arg convention as approveAndPayOrder.bind(null,
 * order.id).
 *
 * Requires role "full" (see src/lib/household.ts) — subscribing is a
 * recurring billing commitment for the whole household, not something
 * a delegated member should be able to start on the owner's behalf
 * without full access. Reuses the "pay" action rather than adding a
 * new one: both are "this moves the household's money" checks, and
 * keeping them under one action avoids the two ever silently drifting
 * apart (e.g. someone loosening "pay" for one-off orders without
 * realizing it also loosens who can start a subscription).
 */
export async function subscribeMembership(tier: MembershipTier) {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/sign-in?next=/membership");

  const settings = await getMembershipSettings();
  if (!settings.salesEnabled || !membershipServicesConfigured()) {
    // Membership sales are off (business default at launch — see
    // src/lib/db/schema.ts's membershipSettings doc comment) or Stripe
    // isn't fully configured for subscriptions yet. Either way, nothing
    // changed — same honest-degradation redirect every other form
    // action in this app uses when a dependency isn't ready.
    redirect("/membership");
  }

  const priceId = getMembershipPriceId(tier);
  if (!priceId) redirect("/membership");

  const owner = await getEffectiveOwner(user.id, user.email);
  // The membership page already hides Subscribe for a role that can't
  // pay (see the membership page's own role check) — re-checked here
  // regardless, since a form action must never trust the UI alone.
  if (!canPerform(owner.role, "pay")) redirect("/membership");

  const db = getDb();

  // Nothing previously stopped a second concurrent subscription: Stripe
  // permits multiple active subscriptions per customer, but this app's
  // memberships table holds one row per owner, so a second subscribe
  // would silently overwrite the first's stripeSubscriptionId — the
  // first keeps billing with no in-app way to reach it again. Block
  // the second attempt outright rather than allow an orphaned
  // subscription; switching tiers is a "cancel, then subscribe again"
  // flow for now, not a live plan-swap.
  const existingMembership = await db
    .select({ status: memberships.status })
    .from(memberships)
    .where(eq(memberships.authUserId, owner.id));
  if (existingMembership[0] && existingMembership[0].status !== "canceled") {
    redirect("/membership");
  }

  // Reuse an existing Stripe Customer if this account already has one
  // (e.g. from a previous subscribe attempt or a canceled membership)
  // rather than creating a duplicate — unlike approve-and-pay.ts's
  // one-off orders, a subscription relationship is meant to persist.
  const profileRows = await db
    .select({ stripeCustomerId: customerProfiles.stripeCustomerId })
    .from(customerProfiles)
    .where(eq(customerProfiles.authUserId, owner.id));
  let stripeCustomerId = profileRows[0]?.stripeCustomerId ?? null;

  const stripe = getStripe();
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: owner.email });
    stripeCustomerId = customer.id;
    await db
      .insert(customerProfiles)
      .values({ authUserId: owner.id, stripeCustomerId })
      .onConflictDoUpdate({
        target: customerProfiles.authUserId,
        set: { stripeCustomerId, updatedAt: new Date() },
      });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Copied onto the resulting Subscription object (not just this
    // Checkout Session) so every later subscription webhook event
    // carries authUserId directly, the same way order webhooks read
    // metadata.orderId — no separate lookup by Stripe customer id
    // needed.
    subscription_data: { metadata: { authUserId: owner.id, tier } },
    metadata: { authUserId: owner.id, tier },
    success_url: `${siteUrl}/membership?subscribed=1`,
    cancel_url: `${siteUrl}/membership`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL");
  }

  redirect(session.url);
}

/** Bound to a "Cancel" form as cancelMembership.bind(null, membershipId).
 *  Cancels at period end, not immediately — the customer keeps access
 *  through what they already paid for. Local status stays "active"
 *  until Stripe's customer.subscription.deleted webhook fires at the
 *  actual period end; that's the single source of truth for status,
 *  same as how order status only ever changes via an explicit
 *  transition, never optimistically here. */
export async function cancelMembership(membershipId: string) {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/sign-in?next=/membership");

  const owner = await getEffectiveOwner(user.id, user.email);
  if (!canPerform(owner.role, "pay")) redirect("/membership");

  const db = getDb();
  const rows = await db.select().from(memberships).where(eq(memberships.id, membershipId));
  const membership = rows[0];

  if (!membership || membership.authUserId !== owner.id) redirect("/membership");

  const stripe = getStripe();
  await stripe.subscriptions.update(membership.stripeSubscriptionId, { cancel_at_period_end: true });

  redirect("/membership");
}
