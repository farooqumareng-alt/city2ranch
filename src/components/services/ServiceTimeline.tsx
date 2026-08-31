import type { TimelineEntry } from "@/lib/audit-timeline";

/**
 * Renders src/lib/audit-timeline.ts's already-labeled entries — the
 * "Service Timeline" from the approved UX blueprint. One shared visual
 * shape; the staff-facing Service Record (Phase 3) will reuse this same
 * component with an un-filtered, un-relabeled entry list rather than a
 * second implementation.
 */
export function ServiceTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div>
      <h3 className="font-serif text-lg text-navy-deep">Timeline</h3>
      <ol className="mt-3 flex flex-col gap-3 border-l border-navy/10 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold"
            />
            <p className="font-sans text-sm text-navy-deep">{entry.label}</p>
            <p className="font-sans text-xs text-charcoal/50">
              {entry.createdAt.toLocaleString()}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
