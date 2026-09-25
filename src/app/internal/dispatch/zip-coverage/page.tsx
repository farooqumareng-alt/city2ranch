import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { listZipMileage, deleteZipMileage } from "@/lib/actions/zip-mileage-management";
import { requireManager } from "@/lib/auth/roles";

// Renamed from "ZIP Coverage" to "Coverage" (2026-09-18, panel
// redesign) — a shorter, plainer noun; applied to the page's own
// title/heading too, not just the sidebar link, so the two don't
// disagree (see StaffSidebar.tsx's own comment on why that matters).
// URL unchanged.
export const metadata: Metadata = { title: "Coverage" };

export default async function ZipCoveragePage() {
  await requireManager();
  const entries = await listZipMileage();

  // Grouped by county (2026-09-25) — 269 ZIPs in one flat list had no
  // structure at all; every existing row was backfilled with real county
  // data in the same migration that added the column (see 0061's own
  // comment). "Uncategorized" only ever catches a pre-migration row that
  // somehow slipped through — the Add/Edit ZIP form requires county now.
  const byCounty = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.county ?? "Uncategorized";
    const list = byCounty.get(key) ?? [];
    list.push(entry);
    byCounty.set(key, list);
  }
  const counties = [...byCounty.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="Coverage"
          description="Every ZIP a price can be computed for. This is the raw mileage data behind Service Zones' Active status — a ZIP with no row here shows as Developing or Outside on the public site."
        />
        <Button href="/internal/dispatch/zip-coverage/new" variant="navy">
          Add ZIP
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No ZIP codes covered yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {counties.map((county) => (
            // Closed by default, unlike Grocery Catalog's collapsible
            // sections — 269 ZIPs across 22 counties all expanded at once
            // reproduces the exact wall-of-rows problem grouping exists to
            // fix; Grocery Catalog's much smaller 110-item/11-category
            // list didn't have that problem to begin with.
            <details key={county} className="group flex flex-col gap-3">
              <summary className="cursor-pointer list-none font-serif text-lg text-navy-deep marker:content-none">
                <span className="inline-block w-4 text-charcoal/40 transition-transform group-open:rotate-90">
                  &#9656;
                </span>{" "}
                {county} <span className="font-sans text-sm font-normal text-charcoal/50">({byCounty.get(county)!.length})</span>
              </summary>
              <RowList>
                {byCounty.get(county)!.map((entry) => (
                  <Row key={entry.id}>
                    <div>
                      <Link
                        href={`/internal/dispatch/zip-coverage/${entry.id}`}
                        className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                      >
                        {entry.zip}
                      </Link>
                      <p className="font-sans text-xs text-charcoal/60">
                        {entry.roundTripMiles} round-trip miles
                        {entry.label ? ` · ${entry.label}` : ""}
                      </p>
                    </div>
                    <JobActionButton
                      action={deleteZipMileage.bind(null, entry.id)}
                      label="Delete"
                      pendingLabel="Deleting…"
                      variant="outline-dark"
                      size="md"
                    />
                  </Row>
                ))}
              </RowList>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
