import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DriversLookupList } from "@/components/dispatch/DriversLookupList";
import { listDrivers } from "@/lib/actions/team-management";
import { getOperationsDashboard } from "@/lib/operations-dashboard";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Drivers" };

/**
 * Any-staff read-only lookup (2026-09-18) — the redesign this codebase
 * calls "the business-first navigation redesign" asked for Drivers as
 * one of Dispatch Staff's own top-level pages; before this, a driver
 * was only reachable by clicking through from an order row. Driver
 * account management (add/toggle active) stays on the super_admin-only
 * Team page — this is purely a lookup.
 *
 * Gained real actions 2026-09-24 (panel redesign round 2): Assign Job
 * (this page fetches the same ready_to_dispatch orders the Orders board
 * already computes, via getOperationsDashboard(), so AssignJobForm has
 * something to offer) and Message (links through to a per-driver thread).
 */
export default async function DriversPage() {
  await requireStaff();
  const [drivers, { workQueue }] = await Promise.all([listDrivers(), getOperationsDashboard()]);
  const readyToDispatchOptions = workQueue
    .filter((item) => item.bucket === "ready_to_dispatch")
    .map((item) => ({
      value: item.id,
      label: `${item.customerName} — ${item.storeName ?? (item.serviceType === "concierge" ? "Concierge" : "City Pickup")}`,
    }));

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="STAFF" title="Drivers" description="Look up a driver's contact info and status." />
      <DriversLookupList
        drivers={drivers.map((d) => ({
          ...d,
          // Postgres bigint (count(*)) arrives as a string via postgres-js,
          // not a number — same coercion listCustomersForLookup()'s own
          // orderCount already needs (see customers/page.tsx).
          todaysJobCount: Number(d.todaysJobCount),
          lastActivityAt: d.lastActivityAt ? new Date(d.lastActivityAt).toISOString() : null,
        }))}
        orderOptions={readyToDispatchOptions}
      />
    </div>
  );
}
