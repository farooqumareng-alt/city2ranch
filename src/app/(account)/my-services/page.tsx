import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwner } from "@/lib/household";
import { getMyServices, type MyServiceBucket } from "@/lib/my-services";
import { claimOrder } from "@/lib/actions/claim-order";

export const metadata: Metadata = {
  title: "My Services",
  description: "Everything you've asked City2Ranch for, in one place.",
};

// Approved blueprint §Navigation map: replaces /requests, /orders, and
// /deliveries as three separate destinations — those routes now redirect
// here (see each of their page.tsx files) rather than being deleted.
const FILTERS: { key: MyServiceBucket | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_action", label: "Needs your action" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

export default async function MyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const owner = await getEffectiveOwner(user.id, user.email);
  const allItems = await getMyServices(owner.id, owner.email);

  const activeFilter = FILTERS.some((f) => f.key === filter) ? (filter as MyServiceBucket | "all") : "all";
  const items = activeFilter === "all" ? allItems : allItems.filter((item) => item.bucket === activeFilter);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="My Services"
          description="Every request, order, and delivery — one list."
        />
        <Button href="/request-service" variant="navy">
          Request Service
        </Button>
      </div>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/my-services" : `/my-services?filter=${f.key}`}
            className={`rounded-full border px-4 py-1.5 font-sans text-sm transition-colors ${
              activeFilter === f.key
                ? "border-navy-deep bg-navy-deep text-white"
                : "border-navy/15 text-charcoal/70 hover:border-gold"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          {activeFilter === "all"
            ? "You haven't requested anything yet."
            : "Nothing here right now."}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {items.map((item) =>
            item.needsClaim ? (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-serif text-base text-navy-deep">{item.title}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {item.createdAt.toLocaleDateString()} · {item.statusLabel}
                  </p>
                </div>
                <form action={claimOrder.bind(null, item.id)}>
                  <Button type="submit" variant="outline-dark" size="md">
                    This is my order
                  </Button>
                </form>
              </div>
            ) : (
              <Link
                key={item.id}
                href={item.href ?? "#"}
                className="flex flex-wrap items-center justify-between gap-4 py-4 hover:bg-white/50"
              >
                <div>
                  <p className="font-serif text-base text-navy-deep">{item.title}</p>
                  <p className="font-sans text-xs text-charcoal/60">{item.createdAt.toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm text-charcoal/70">{item.statusLabel}</span>
                  {item.totalCents != null ? (
                    <span className="font-sans text-sm font-medium text-navy-deep">
                      ${(item.totalCents / 100).toFixed(2)}
                    </span>
                  ) : null}
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
