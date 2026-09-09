/**
 * Extracted from /internal/dispatch/page.tsx (Overview) when Business
 * Overview (Phase 5) needed the exact same tile shape — one place now,
 * not two copies drifting apart.
 *
 * `tone` added 2026-09-09 (Priority 4 of the master implementation
 * directive) so a genuinely urgent figure (Exceptions > 0) reads as
 * urgent at a glance, not just as a bigger number in the same navy as
 * everything else — same "critical" red StatusBadge already uses for
 * a failed order, not a new color vocabulary.
 */
export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "critical";
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">{label}</p>
      <p className={`font-serif text-2xl ${tone === "critical" ? "text-red-600" : "text-navy-deep"}`}>{value}</p>
    </div>
  );
}
