import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { StatTile } from "@/components/ui/StatTile";
import { WorkQueueBoard } from "@/components/dispatch/WorkQueueBoard";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { WORK_QUEUE_TABS, type WorkQueueBucket } from "@/lib/work-queue-types";
import { getDb } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Orders" };

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
 * tab always points at the exact Work Queue tab that shows this same
 * count — since Overview and Work Queue became one screen (2026-09-16),
 * that's a same-page tab switch, not a navigation at all.
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

/**
 * Orders — formerly two separate screens (Overview + Work Queue),
 * merged into one (2026-09-16, business-first navigation redesign): a
 * dispatcher should never have to think "where do I go" between a
 * summary page and the actual worklist. Needs Attention leads (the
 * most actionable content, first), then a small honest "today" read on
 * real order states, then the full pipeline breakdown, then the
 * complete tabbed Work Queue board — one URL, one workflow. The old
 * /internal/dispatch/queue URL now redirects here with its tab
 * preserved.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Re-checked here, not just relied on via DispatchLayout (requireStaff()
  // only) or getOperationsDashboard()'s own gate — every page in this app
  // re-verifies its own authorization independently of its layout.
  await requireStaff();
  const { tab } = await searchParams;
  const initialTab = WORK_QUEUE_TABS.some((t) => t.key === tab) ? (tab as WorkQueueBucket) : undefined;

  const db = getDb();
  const [{ stats, needsAttention, workQueue }, activeDrivers] = await Promise.all([
    getOperationsDashboard(),
    db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.isActive, true)),
  ]);
  const driverOptions = activeDrivers.map((d) => ({ value: d.id, label: d.name }));

  const hasAnyAttentionItems =
    needsAttention.needsQuote.length > 0 ||
    needsAttention.unassignedPaidOrders.length > 0 ||
    needsAttention.recentFailedOrders.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Orders"
        description="Everything that needs a response, today's real activity, the full pipeline, and the complete worklist — one screen."
      />

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

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
          Today&apos;s Activity
        </h3>
        <div className="grid gap-4 sm:grid-cols-3 lg:w-3/4">
          <Link href="/internal/dispatch?tab=in_progress">
            <Card padding="sm" className="transition-colors hover:border-gold">
              <StatTile label="Active Jobs" value={stats.inProgress} />
            </Card>
          </Link>
          <Card padding="sm">
            <StatTile label="Drivers Out Now" value={stats.driversOutNow} />
          </Card>
          <Link href="/internal/dispatch?tab=in_progress">
            <Card padding="sm" className="transition-colors hover:border-gold">
              <StatTile label="Pickup Pending" value={stats.pickupPending} />
            </Card>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
          Pipeline
        </h3>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PIPELINE_TILES.map((tile) => (
            <Link key={tile.key} href={`/internal/dispatch?tab=${tile.tab}`}>
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
        <div className="grid gap-4 sm:grid-cols-3 lg:w-3/4">
          {/* Not part of the order pipeline (no Work Queue tab to link
              to) — the guest-facing signups/messages upstream of it.
              See listInboxEntries()'s own doc comment on why this exists. */}
          <Link href="/internal/dispatch/inbox">
            <Card padding="sm" className="transition-colors hover:border-gold">
              <StatTile
                label="New in Inbox"
                value={stats.newInboxEntries}
                tone={stats.newInboxEntries > 0 ? "critical" : "neutral"}
              />
            </Card>
          </Link>
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

      <section className="flex flex-col gap-4 border-t border-navy/10 pt-8">
        <h3 className="font-serif text-lg text-navy-deep">All Orders &amp; Requests</h3>
        <WorkQueueBoard items={workQueue} driverOptions={driverOptions} initialTab={initialTab} />
      </section>
    </div>
  );
}
