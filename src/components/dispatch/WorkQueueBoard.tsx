"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { canTransition } from "@/lib/orders/status";
import { cancelOrder, failOrder } from "@/lib/actions/staff-order-exceptions";
import { AssignDriverForm } from "@/components/dispatch/AssignDriverForm";
import { OrderExceptionForm } from "@/components/dispatch/OrderExceptionForm";
import { formatPlainDate } from "@/lib/format";
import { BOARD_TABS, type WorkQueueItem, type BoardTabKey } from "@/lib/work-queue-types";

function matchesSearch(item: WorkQueueItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.customerName.toLowerCase().includes(q) ||
    (item.customerPhone?.toLowerCase().includes(q) ?? false) ||
    (item.retailerOrderNumber?.toLowerCase().includes(q) ?? false) ||
    (item.driverName?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * The unified Orders board UI — approved blueprint: one board, tabbed by
 * what staff needs to do next, replacing separate Dispatch Queue and
 * Concierge Quotes pages. Client-side search/tab filtering over an
 * already-fetched, still-small dataset — same scoping note as the old
 * QueueBoard this replaces (src/lib/work-queue.ts's own doc comment).
 *
 * Tabs are BOARD_TABS (work-queue-types.ts), not a raw WorkQueueBucket
 * list — matches the plain-noun labels the Operations dashboard's own
 * Pipeline tiles already use (2026-09-18, panel redesign), and lets one
 * bucket (needs_quote) present as two tabs by kind, plus an "All" tab
 * that isn't a real bucket at all.
 */
export function WorkQueueBoard({
  items,
  driverOptions,
  initialTab,
}: {
  items: WorkQueueItem[];
  driverOptions: { value: string; label: string }[];
  initialTab?: BoardTabKey;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<BoardTabKey>(initialTab ?? "new_leads");

  const activeTab = BOARD_TABS.find((t) => t.key === tab) ?? BOARD_TABS[0];

  const counts = useMemo(() => {
    const map = new Map<BoardTabKey, number>();
    for (const t of BOARD_TABS) map.set(t.key, items.filter(t.match).length);
    return map;
  }, [items]);

  const visible = useMemo(
    () => items.filter((item) => activeTab.match(item) && matchesSearch(item, query.trim())),
    [items, activeTab, query]
  );

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Orders tabs" className="flex flex-wrap gap-2">
        {BOARD_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 font-sans text-sm transition-colors ${
              tab === t.key
                ? "border-navy-deep bg-navy-deep text-white"
                : "border-navy/15 text-charcoal/70 hover:border-gold"
            }`}
          >
            {t.label} <span className="opacity-70">({counts.get(t.key) ?? 0})</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="work-queue-search" className="font-sans text-sm font-medium text-navy-deep">
          Search
        </label>
        <input
          id="work-queue-search"
          type="text"
          placeholder="Customer, phone, order #, or driver"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState message={query.trim() ? "No matches in this tab." : "Nothing here right now."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-charcoal/50">
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Service Type</th>
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Driver</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const canCancel =
                  item.kind === "order" && item.status ? canTransition(item.status, "cancelled") : false;
                const canFail = item.kind === "order" && item.status ? canTransition(item.status, "failed") : false;
                const detail =
                  item.retailerOrderNumber ||
                  item.deliveryCity ||
                  item.customerPhone ||
                  item.referralSource ||
                  item.requestedDeliveryDate;
                return (
                  <tr key={`${item.kind}-${item.id}`} className="border-b border-navy/10 align-top">
                    <td className="py-3 pr-4">
                      <p className="text-navy-deep">
                        {item.authUserId ? (
                          <Link
                            href={`/internal/dispatch/admin/customers/${item.authUserId}`}
                            className="underline decoration-navy-deep/20 hover:text-gold"
                          >
                            {item.customerName}
                          </Link>
                        ) : (
                          item.customerName
                        )}
                      </p>
                      {detail ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-charcoal/50 hover:text-gold">
                            Details
                          </summary>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-charcoal/60">
                            {item.retailerOrderNumber ? <span>Order #{item.retailerOrderNumber}</span> : null}
                            {item.deliveryCity ? (
                              <span>
                                {item.deliveryCity}, {item.deliveryState} {item.deliveryZip}
                              </span>
                            ) : null}
                            {item.customerPhone ? <span>{item.customerPhone}</span> : null}
                            {item.requestedDeliveryDate ? (
                              <span>Requested for {formatPlainDate(item.requestedDeliveryDate)}</span>
                            ) : null}
                            {item.referralSource ? (
                              <span className="font-medium text-gold">Referred by: {item.referralSource}</span>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-charcoal/70">
                      {item.kind === "request"
                        ? "Concierge Request"
                        : (item.storeName ?? (item.serviceType === "concierge" ? "Concierge" : "City Pickup"))}
                    </td>
                    <td className="py-3 pr-4 text-charcoal/70">{item.createdAt.toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      {item.status ? (
                        <StatusBadge status={item.status} />
                      ) : (
                        // A raw, not-yet-converted request has no order
                        // status yet — a plain pill, not StatusBadge, since
                        // that component's labels are all order-lifecycle
                        // copy (e.g. quote_pending reads "Preparing your
                        // quote," which isn't true of a request nobody has
                        // touched yet).
                        <span className="inline-flex items-center rounded-full border border-navy/15 bg-navy/5 px-2.5 py-1 font-sans text-xs font-medium text-navy-deep">
                          Under review
                        </span>
                      )}
                      {item.totalCents != null && item.totalCents > 0 ? (
                        <p className="mt-1 text-xs text-charcoal/60">${(item.totalCents / 100).toFixed(2)}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-charcoal/70">{item.driverName ?? "—"}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {item.kind === "request" ? (
                          <Button href={item.href} variant="outline-dark" size="md">
                            Start Quote
                          </Button>
                        ) : (
                          <>
                            <Link
                              href={item.href}
                              className="font-medium text-navy-deep underline decoration-navy/20 hover:text-gold"
                            >
                              {item.bucket === "needs_quote" ? "Build Quote →" : "Open Record →"}
                            </Link>
                            {item.bucket === "ready_to_dispatch" ? (
                              <AssignDriverForm orderId={item.id} driverOptions={driverOptions} />
                            ) : null}
                            {canCancel ? (
                              <OrderExceptionForm orderId={item.id} action={cancelOrder} label="Cancel" />
                            ) : null}
                            {canFail ? (
                              <OrderExceptionForm orderId={item.id} action={failOrder} label="Flag failed" />
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
