"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";

export type DriverLookupRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

function matchesSearch(row: DriverLookupRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    row.name.toLowerCase().includes(q) ||
    (row.phone?.toLowerCase().includes(q) ?? false) ||
    (row.email?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Client-side search over an already-fetched, still-small dataset —
 * same pattern as WorkQueueBoard.tsx's own matchesSearch(), not a new
 * one invented for this page. Every row here is visible to any staff
 * member (see listDrivers()'s own doc comment) and links through to the
 * driver detail page, which itself hides Hiring & Compliance/Documents
 * from a non-super_admin viewer.
 */
export function DriversLookupList({ drivers }: { drivers: DriverLookupRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => drivers.filter((d) => matchesSearch(d, query.trim())), [drivers, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="drivers-search" className="font-sans text-sm font-medium text-navy-deep">
          Search
        </label>
        <input
          id="drivers-search"
          type="text"
          placeholder="Name, phone, or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState message={query.trim() ? "No matches." : "No drivers yet."} />
      ) : (
        <RowList>
          {visible.map((driver) => (
            <Row key={driver.id}>
              <div>
                <Link
                  href={`/internal/dispatch/admin/drivers/${driver.id}`}
                  className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                >
                  {driver.name}
                </Link>
                <p className="font-sans text-xs text-charcoal/60">
                  {driver.phone ?? "No phone on file"}
                  {driver.email ? ` · ${driver.email}` : ""}
                  {!driver.isActive ? " · Disabled" : ""}
                </p>
              </div>
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
