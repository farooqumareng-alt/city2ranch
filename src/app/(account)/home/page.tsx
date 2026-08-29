import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { getAccountDashboard } from "@/lib/account-dashboard";
import { getOwnProfile } from "@/lib/customer-profile";
import { ORDER_STATUS_LABELS } from "@/lib/orders/labels";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Home",
  description: "Your City2Ranch account.",
};

export default async function AccountHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const [dashboard, profile] = await Promise.all([getAccountDashboard(ownerId), getOwnProfile(ownerId)]);

  const firstName = profile?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-12">
      <div>
        <p className="font-sans text-sm text-charcoal/60">Welcome back{firstName ? `, ${firstName}` : ""}.</p>
        <h1 className="mt-1 font-serif text-3xl text-navy-deep">What can we take care of for you?</h1>
      </div>

      <Button href="/request-service" variant="gold" size="lg" className="self-start">
        + Request a Service
      </Button>

      <div className="grid gap-3 sm:grid-cols-4">
        <Link
          href="/request-service"
          className="rounded-sm border border-navy/10 bg-white/60 p-4 text-center font-sans text-sm font-medium text-navy-deep transition-colors hover:border-gold"
        >
          Request Service
        </Link>
        {dashboard.listCount > 0 ? (
          <Link
            href="/lists"
            className="rounded-sm border border-navy/10 bg-white/60 p-4 text-center font-sans text-sm font-medium text-navy-deep transition-colors hover:border-gold"
          >
            Repeat a List
          </Link>
        ) : (
          <Link
            href="/orders/new"
            className="rounded-sm border border-navy/10 bg-white/60 p-4 text-center font-sans text-sm font-medium text-navy-deep transition-colors hover:border-gold"
          >
            Request a Pickup
          </Link>
        )}
        <Link
          href="/deliveries"
          className="rounded-sm border border-navy/10 bg-white/60 p-4 text-center font-sans text-sm font-medium text-navy-deep transition-colors hover:border-gold"
        >
          View Deliveries
        </Link>
        <Link
          href="/support"
          className="rounded-sm border border-navy/10 bg-white/60 p-4 text-center font-sans text-sm font-medium text-navy-deep transition-colors hover:border-gold"
        >
          Contact Concierge
        </Link>
      </div>

      {dashboard.nextUp ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg text-navy-deep">Next Up</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-gold/40 bg-gold/10 p-6">
            <div>
              <p className="font-serif text-lg text-navy-deep">
                {dashboard.nextUp.serviceType === "concierge"
                  ? "Concierge Order"
                  : (dashboard.nextUp.storeName ?? "Order")}
              </p>
              <p className="font-sans text-sm text-charcoal/70">{ORDER_STATUS_LABELS[dashboard.nextUp.status]}</p>
            </div>
            <Button href={`/orders/${dashboard.nextUp.id}`} variant="navy" size="md">
              View Details
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6">
          <h2 className="font-serif text-lg text-navy-deep">Your City2Ranch</h2>
          <dl className="flex flex-col gap-2 font-sans text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Primary place</dt>
              <dd className="text-navy-deep">
                {dashboard.defaultPlaceName ?? <Link href="/places/new" className="underline decoration-gold/50">Add one</Link>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Saved lists</dt>
              <dd className="text-navy-deep">{dashboard.listCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal/60">Household</dt>
              <dd className="text-navy-deep">
                {dashboard.isHouseholdMember
                  ? "Member of another account"
                  : dashboard.householdMemberCount > 0
                    ? `${dashboard.householdMemberCount} member${dashboard.householdMemberCount === 1 ? "" : "s"}`
                    : "Just you"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6">
          <h2 className="font-serif text-lg text-navy-deep">Recent Activity</h2>
          {dashboard.recentOrders.length === 0 ? (
            <p className="font-sans text-sm text-charcoal/60">Nothing yet — your first request will show up here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboard.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 font-sans text-sm">
                  <Link href={`/orders/${order.id}`} className="text-charcoal/80 hover:text-gold">
                    {order.serviceType === "concierge" ? "Concierge Order" : (order.storeName ?? "Order")}
                    {order.createdAt ? ` — ${formatPlainDate(order.createdAt.toISOString().slice(0, 10))}` : ""}
                  </Link>
                  <span className="shrink-0 text-charcoal/60">
                    {order.status === "completed" ? "✓ " : "○ "}
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
