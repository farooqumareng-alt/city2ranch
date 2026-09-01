import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { StatTile } from "@/components/ui/StatTile";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Operations Center" };

// Each stat tile now links to where that number actually lives —
// lifecycle audit issue #4 ("cards aren't clickable"). New Leads and
// Pending Quotes intentionally point at the same tab: both are the
// "needs_quote" bucket, just split here by kind (request vs. already-
// converted order) for the count — there's no second destination to
// send them to.
const TILE_LINKS = {
  newLeads: "/internal/dispatch/queue?tab=needs_quote",
  pendingConciergeQuotes: "/internal/dispatch/queue?tab=needs_quote",
  awaitingPayment: "/internal/dispatch/queue?tab=awaiting_customer",
  activeJobs: "/internal/dispatch/queue?tab=ready_to_dispatch",
  activeDrivers: "/internal/dispatch/admin/team",
  todaysRevenueCents: "/internal/dispatch/admin",
};

export default async function DispatchDashboardPage() {
  // Re-checked here, not just relied on via DispatchLayout (requireStaff()
  // only) or getOperationsDashboard()'s own gate — every page in this app
  // re-verifies its own authorization independently of its layout.
  await requireStaff();
  const { stats, needsAttention } = await getOperationsDashboard();
  const hasAnyAttentionItems =
    needsAttention.needsQuote.length > 0 ||
    needsAttention.unassignedPaidOrders.length > 0 ||
    needsAttention.recentFailedOrders.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Operations Center"
        description="Today's fulfillment status at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Link href={TILE_LINKS.newLeads}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="New Leads" value={stats.newLeads} />
          </Card>
        </Link>
        <Link href={TILE_LINKS.pendingConciergeQuotes}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="Pending Quotes" value={stats.pendingConciergeQuotes} />
          </Card>
        </Link>
        <Link href={TILE_LINKS.awaitingPayment}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="Awaiting Payment" value={stats.awaitingPayment} />
          </Card>
        </Link>
        <Link href={TILE_LINKS.activeJobs}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="Active Jobs" value={stats.activeJobs} />
          </Card>
        </Link>
        <Link href={TILE_LINKS.activeDrivers}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="Active Drivers" value={stats.activeDrivers} />
          </Card>
        </Link>
        <Link href={TILE_LINKS.todaysRevenueCents}>
          <Card padding="sm" className="transition-colors hover:border-gold">
            <StatTile label="Collected Today" value={`$${(stats.todaysRevenueCents / 100).toFixed(2)}`} />
          </Card>
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Needs Attention</h3>
        {!hasAnyAttentionItems ? (
          <EmptyState message="Nothing needs attention right now." />
        ) : (
          <RowList>
            {needsAttention.needsQuote.map((item) => (
              <Row key={item.id} href={item.href}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{item.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {item.kind === "request" ? "New request — needs a quote" : "Concierge order — needs a quote"}
                  </p>
                </div>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </Row>
            ))}
            {needsAttention.unassignedPaidOrders.map((item) => (
              <Row key={item.id} href={item.href}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{item.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">Paid, no driver assigned yet</p>
                </div>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </Row>
            ))}
            {needsAttention.recentFailedOrders.map((item) => (
              <Row key={item.id} href={item.customerPhone ? `tel:${item.customerPhone}` : item.href}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{item.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    Flagged failed — needs a follow-up call
                    {item.customerPhone ? ` (${item.customerPhone})` : ""}
                  </p>
                </div>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </Row>
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
