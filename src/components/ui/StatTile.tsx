/**
 * Extracted from /internal/dispatch/page.tsx (Overview) when Business
 * Overview (Phase 5) needed the exact same tile shape — one place now,
 * not two copies drifting apart.
 */
export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">{label}</p>
      <p className="font-serif text-2xl text-navy-deep">{value}</p>
    </div>
  );
}
