"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { canTransition } from "@/lib/orders/status";
import { cancelOrder, failOrder } from "@/lib/actions/staff-order-exceptions";
import { AssignDriverForm } from "@/components/dispatch/AssignDriverForm";
import { OrderExceptionForm } from "@/components/dispatch/OrderExceptionForm";
import { formatPlainDate } from "@/lib/format";
import { WORK_QUEUE_TABS, type WorkQueueItem, type WorkQueueBucket } from "@/lib/work-queue-types";

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
 * The unified Work Queue UI — approved blueprint: one board, tabbed by
 * what staff needs to do next, replacing separate Dispatch Queue and
 * Concierge Quotes pages. Client-side search/tab filtering over an
 * already-fetched, still-small dataset — same scoping note as the old
 * QueueBoard this replaces (src/lib/work-queue.ts's own doc comment).
 */
export function WorkQueueBoard({
  items,
  driverOptions,
  initialTab,
}: {
  items: WorkQueueItem[];
  driverOptions: { value: string; label: string }[];
  initialTab?: WorkQueueBucket;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<WorkQueueBucket>(initialTab ?? "needs_quote");

  const counts = useMemo(() => {
    const map = new Map<WorkQueueBucket, number>();
    for (const item of items) map.set(item.bucket, (map.get(item.bucket) ?? 0) + 1);
    return map;
  }, [items]);

  const visible = useMemo(
    () => items.filter((item) => item.bucket === tab && matchesSearch(item, query.trim())),
    [items, tab, query]
  );

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Work Queue tabs" className="flex flex-wrap gap-2">
        {WORK_QUEUE_TABS.map((t) => (
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
        <div className="flex flex-col gap-6">
          {visible.map((item) => {
            const canCancel = item.kind === "order" && item.status ? canTransition(item.status, "cancelled") : false;
            const canFail = item.kind === "order" && item.status ? canTransition(item.status, "failed") : false;
            return (
              <Card key={`${item.kind}-${item.id}`} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-lg text-navy-deep">
                      {item.authUserId ? (
                        <Link
                          href={`/internal/dispatch/admin/customers/${item.authUserId}`}
                          className="underline decoration-navy-deep/20 hover:text-gold"
                        >
                          {item.customerName}
                        </Link>
                      ) : (
                        item.customerName
                      )}{" "}
                      —{" "}
                      {item.kind === "request"
                        ? "Concierge Request"
                        : (item.storeName ?? (item.serviceType === "concierge" ? "Concierge" : "City Pickup"))}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      {item.retailerOrderNumber ? `Order #${item.retailerOrderNumber} · ` : ""}
                      {item.deliveryCity ? `${item.deliveryCity}, ${item.deliveryState} ${item.deliveryZip} · ` : ""}
                      {item.customerPhone}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      {item.kind === "request" ? "Submitted" : "Placed"} {item.createdAt.toLocaleString()}
                      {item.requestedDeliveryDate ? ` · Requested for ${formatPlainDate(item.requestedDeliveryDate)}` : ""}
                    </p>
                    {item.referralSource ? (
                      <p className="font-sans text-xs font-medium text-gold">Referred by: {item.referralSource}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
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
                      <span className="font-sans text-sm text-charcoal/70">
                        ${(item.totalCents / 100).toFixed(2)}
                      </span>
                    ) : null}
                    {item.driverName ? (
                      <span className="font-sans text-xs text-charcoal/60">Driver: {item.driverName}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-navy/10 pt-4">
                  {item.kind === "request" ? (
                    <Button href={item.href} variant="outline-dark">
                      Start Quote
                    </Button>
                  ) : (
                    <>
                      <Link
                        href={item.href}
                        className="font-sans text-sm font-medium text-navy-deep underline decoration-navy/20 hover:text-gold"
                      >
                        {item.bucket === "needs_quote" ? "Build Quote →" : "Open Service Record →"}
                      </Link>
                      {item.bucket === "ready_to_dispatch" ? (
                        <AssignDriverForm orderId={item.id} driverOptions={driverOptions} />
                      ) : null}
                      {canCancel ? <OrderExceptionForm orderId={item.id} action={cancelOrder} label="Cancel" /> : null}
                      {canFail ? <OrderExceptionForm orderId={item.id} action={failOrder} label="Flag failed" /> : null}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
