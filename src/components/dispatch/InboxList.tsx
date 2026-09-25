"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { InboxStatusSelect } from "@/components/dispatch/InboxStatusSelect";
import { SOURCE_LABELS, type InboxEntry } from "@/lib/inbox-types";

type TabKey = "inbox" | "spam" | "all";

const TABS: { key: TabKey; label: string; match: (entry: InboxEntry) => boolean }[] = [
  { key: "inbox", label: "Inbox", match: (e) => !e.isLikelySpam },
  { key: "spam", label: "Likely Spam", match: (e) => e.isLikelySpam },
  { key: "all", label: "All", match: () => true },
];

/**
 * Split out of inbox/page.tsx (2026-09-25) so the "Likely Spam" filter
 * can be a same-page tab switch, same pattern as WorkQueueBoard.tsx's
 * own tab bar. Defaults to the "Inbox" tab (spam hidden) — real entries
 * are what staff want to see first; nothing is ever deleted, so a
 * misflagged entry is always one click away on "All" or "Likely Spam".
 */
export function InboxList({ entries }: { entries: InboxEntry[] }) {
  const [tab, setTab] = useState<TabKey>("inbox");
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const counts = useMemo(() => {
    const map = new Map<TabKey, number>();
    for (const t of TABS) map.set(t.key, entries.filter(t.match).length);
    return map;
  }, [entries]);

  const visible = useMemo(() => entries.filter(activeTab.match), [entries, activeTab]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Inbox tabs" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
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

      {visible.length === 0 ? (
        <EmptyState message={tab === "spam" ? "Nothing flagged right now." : "Nothing here yet."} />
      ) : (
        <RowList>
          {visible.map((entry) => (
            <Row key={`${entry.source}-${entry.id}`}>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-navy-deep">
                    {SOURCE_LABELS[entry.source]}
                  </span>
                  {entry.isLikelySpam ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-red-700">
                      Likely spam
                    </span>
                  ) : null}
                  <p className="font-sans text-sm font-medium text-navy-deep">{entry.name}</p>
                </div>
                <p className="font-sans text-xs text-charcoal/70">
                  {entry.email}
                  {entry.phone ? ` · ${entry.phone}` : ""}
                </p>
                <p className="font-sans text-xs text-charcoal/60">{entry.context}</p>
                {entry.message ? (
                  <p className="max-w-xl whitespace-pre-wrap font-sans text-xs text-charcoal/70">{entry.message}</p>
                ) : null}
                <p className="font-sans text-[11px] text-charcoal/40">{entry.createdAt.toLocaleString()}</p>
              </div>
              <InboxStatusSelect source={entry.source} id={entry.id} currentStatus={entry.status} />
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
