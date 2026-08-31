import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Operations Center" };

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">{label}</p>
      <p className="font-serif text-2xl text-navy-deep">{value}</p>
    </div>
  );
}

export default async function DispatchDashboardPage() {
  // Re-checked here, not just relied on via DispatchLayout (requireStaff()
  // only) or getOperationsDashboard()'s own gate — every page in this app
  // re-verifies its own authorization independently of its layout.
  await requireStaff();
  const { stats, needsAttention } = await getOperationsDashboard();
  const hasAnyAttentionItems =
    needsAttention.unassignedPaidOrders.length > 0 ||
    needsAttention.agedConciergeQuotes.length > 0 ||
    needsAttention.recentFailedOrders.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Operations Center"
        description="Today's fulfillment status at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card padding="sm">
          <StatTile label="New Leads" value={stats.newLeads} />
        </Card>
        <Card padding="sm">
          <StatTile label="Pending Quotes" value={stats.pendingConciergeQuotes} />
        </Card>
        <Card padding="sm">
          <StatTile label="Awaiting Payment" value={stats.awaitingPayment} />
        </Card>
        <Card padding="sm">
          <StatTile label="Active Jobs" value={stats.activeJobs} />
        </Card>
        <Card padding="sm">
          <StatTile label="Active Drivers" value={stats.activeDrivers} />
        </Card>
        <Card padding="sm">
          <StatTile label="Collected Today" value={`$${(stats.todaysRevenueCents / 100).toFixed(2)}`} />
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Needs Attention</h3>
        {!hasAnyAttentionItems ? (
          <EmptyState message="Nothing needs attention right now." />
        ) : (
          <RowList>
            {needsAttention.unassignedPaidOrders.map((order) => (
              <Row key={order.id} href="/internal/dispatch/queue">
                <div>
                  <p className="font-sans text-sm text-navy-deep">{order.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">Paid, no driver assigned yet</p>
                </div>
                <StatusBadge status="paid" />
              </Row>
            ))}
            {needsAttention.agedConciergeQuotes.map((order) => (
              <Row key={order.id} href={`/internal/dispatch/concierge/${order.id}`}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{order.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">Quote stalled over 24 hours</p>
                </div>
                <StatusBadge status={order.status} />
              </Row>
            ))}
            {needsAttention.recentFailedOrders.map((order) => (
              <Row key={order.id} href={order.customerPhone ? `tel:${order.customerPhone}` : undefined}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{order.customerName}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    Flagged failed — needs a follow-up call
                    {order.customerPhone ? ` (${order.customerPhone})` : ""}
                  </p>
                </div>
                <StatusBadge status="failed" />
              </Row>
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
