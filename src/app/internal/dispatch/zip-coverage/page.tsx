import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { JobActionButton } from "@/components/driver/JobActionButton";
import { listZipMileage, deleteZipMileage } from "@/lib/actions/zip-mileage-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "ZIP Coverage" };

export default async function ZipCoveragePage() {
  await requireStaff();
  const entries = await listZipMileage();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="ZIP Coverage"
          description="Every ZIP a price can be computed for. This is the raw mileage data behind Service Zones' Active status — a ZIP with no row here shows as Developing or Outside on the public site."
        />
        <Button href="/internal/dispatch/zip-coverage/new" variant="navy">
          Add ZIP
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No ZIP codes covered yet." />
      ) : (
        <RowList>
          {entries.map((entry) => (
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
      )}
    </div>
  );
}
