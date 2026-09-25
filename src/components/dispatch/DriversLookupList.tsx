"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignJobForm } from "@/components/dispatch/AssignJobForm";

export type DriverLookupRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  todaysJobCount: number;
  lastActivityAt: string | null;
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
 * same pattern as WorkQueueBoard.tsx's own matchesSearch(). A plain
 * table (2026-09-24, panel redesign round 2), matching the same
 * Customer/Service/Date/Status/Driver/Actions table convention Orders
 * uses — Today's Jobs/Last Activity are real, computed columns (see
 * listDrivers()'s own doc comment), never fabricated. Assign Job reuses
 * the exact same assignDriver action the Orders table's AssignDriverForm
 * calls, just starting from the driver side instead of the order side.
 */
export function DriversLookupList({
  drivers,
  orderOptions,
}: {
  drivers: DriverLookupRow[];
  orderOptions: { value: string; label: string }[];
}) {
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
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-charcoal/50">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Today&apos;s Jobs</th>
                <th className="pb-2 pr-4 font-medium">Phone</th>
                <th className="pb-2 pr-4 font-medium">Last Activity</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((driver) => (
                <tr key={driver.id} className="border-b border-navy/10 align-top">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/internal/dispatch/admin/drivers/${driver.id}`}
                      className="text-navy-deep underline decoration-navy/20 hover:text-gold"
                    >
                      {driver.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-charcoal/70">{driver.isActive ? "Active" : "Disabled"}</td>
                  <td className="py-3 pr-4 text-charcoal/70">{driver.todaysJobCount}</td>
                  <td className="py-3 pr-4 text-charcoal/70">{driver.phone ?? "—"}</td>
                  <td className="py-3 pr-4 text-charcoal/70">
                    {driver.lastActivityAt ? new Date(driver.lastActivityAt).toLocaleString() : "No activity yet"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <AssignJobForm driverId={driver.id} orderOptions={orderOptions} />
                      <Link
                        href={`/internal/dispatch/admin/drivers/${driver.id}/messages`}
                        className="font-medium text-navy-deep underline decoration-navy/20 hover:text-gold"
                      >
                        Message
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
