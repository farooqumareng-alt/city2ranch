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

/**
 * Every one of the 8 real pipeline stages (Work Queue's own
 * WORK_QUEUE_TABS, see work-queue-types.ts) as its own tile — Priority 4
 * of the master implementation directive ("Operations must become the
 * center of the admin experience... the administrator should not have
 * to search through unrelated pages to discover work requiring
 * attention"). Before this, Ready to Dispatch / Awaiting Driver
 * Response / In Progress were collapsed into one "Active Jobs" number
 * — a job stalled waiting on a driver's response looked identical to
 * one already rolling. needsPayment (mid-Stripe-checkout) had no tile
 * at all, even though Work Queue always had the tab. New Leads and
 * Pending Quotes still split the single needs_quote bucket by kind
 * (request vs. already-converted order) — that distinction predates
 * this change and still matters: a lead needs a quote built from
 * scratch, an order just needs its quote finalized.
 *
 * href always points at the exact Work Queue tab that shows this same
 * count, so what a tile promises and what its destination shows never
 * drift apart (lifecycle audit issue #4, "cards aren't clickable" —
 * still true here, just for the whole pipeline now, not part of it).
 */
const PIPELINE_TILES = [
  { key: "newLeads", label: "New Leads", tab: "needs_quote" },
  { key: "pendingConciergeQuotes", label: "Pending Quotes", tab: "needs_quote" },
  { key: "awaitingPayment", label: "Awaiting Payment", tab: "awaiting_customer" },
  { key: "processingPayment", label: "Processing Payment", tab: "needs_payment" },
  { key: "readyToDispatch", label: "Ready to Dispatch", tab: "ready_to_dispatch" },
  { key: "awaitingDriverResponse", label: "Awaiting Driver", tab: "awaiting_driver_response" },
  { key: "inProgress", label: "In Progress", tab: "in_progress" },
  { key: "exceptions", label: "Exceptions", tab: "exceptions" },
  { key: "completed", label: "Completed", tab: "completed" },
] as const;

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
        description="The full pipeline, and today's fulfillment status, at a glance."
      />

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
          Pipeline
        </h3>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PIPELINE_TILES.map((tile) => (
            <Link key={tile.key} href={`/internal/dispatch/queue?tab=${tile.tab}`}>
              <Card padding="sm" className="transition-colors hover:border-gold">
                <StatTile
                  label={tile.label}
                  value={stats[tile.key]}
                  tone={tile.key === "exceptions" && stats.exceptions > 0 ? "critical" : "neutral"}
                />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
          Business
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:w-1/2">
          <Link href="/internal/dispatch/admin/team">
            <Card padding="sm" className="transition-colors hover:border-gold">
              <StatTile label="Active Drivers" value={stats.activeDrivers} />
            </Card>
          </Link>
          <Link href="/internal/dispatch/admin">
            <Card padding="sm" className="transition-colors hover:border-gold">
              <StatTile label="Collected Today" value={`$${(stats.todaysRevenueCents / 100).toFixed(2)}`} />
            </Card>
          </Link>
        </div>
      </section>

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
