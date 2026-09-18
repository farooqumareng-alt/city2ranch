"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";

export type CustomerLookupRow = {
  authUserId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  orderCount: number;
  lastOrderAt: string;
};

function matchesSearch(row: CustomerLookupRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (row.name?.toLowerCase().includes(q) ?? false) ||
    (row.email?.toLowerCase().includes(q) ?? false) ||
    (row.phone?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Client-side search over an already-fetched, still-small dataset —
 * same pattern as WorkQueueBoard.tsx's own matchesSearch(), not a new
 * one invented for this page. Links through to the existing customer
 * profile page, which itself hides the Edit control/Edit History from
 * a non-super_admin viewer — everything else there (orders, places,
 * household, membership) is visible to any staff member.
 */
export function CustomersLookupList({ customers }: { customers: CustomerLookupRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => customers.filter((c) => matchesSearch(c, query.trim())), [customers, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="customers-search" className="font-sans text-sm font-medium text-navy-deep">
          Search
        </label>
        <input
          id="customers-search"
          type="text"
          placeholder="Name, email, or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState message={query.trim() ? "No matches." : "No customers yet."} />
      ) : (
        <RowList>
          {visible.map((customer) => (
            <Row key={customer.authUserId}>
              <div>
                <Link
                  href={`/internal/dispatch/admin/customers/${customer.authUserId}`}
                  className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                >
                  {customer.name ?? "Unnamed Customer"}
                </Link>
                <p className="font-sans text-xs text-charcoal/60">
                  {customer.email ?? "(no email on file)"}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                  {" · "}
                  {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                  {" · Last order "}
                  {new Date(customer.lastOrderAt).toLocaleDateString()}
                </p>
              </div>
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
