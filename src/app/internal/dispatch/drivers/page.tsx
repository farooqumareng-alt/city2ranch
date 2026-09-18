import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DriversLookupList } from "@/components/dispatch/DriversLookupList";
import { listDrivers } from "@/lib/actions/team-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Drivers" };

/**
 * Any-staff read-only lookup (2026-09-18) — the redesign this codebase
 * calls "the business-first navigation redesign" asked for Drivers as
 * one of Dispatch Staff's own top-level pages; before this, a driver
 * was only reachable by clicking through from an order row. Driver
 * account management (add/toggle active) stays on the super_admin-only
 * Team page — this is purely a lookup.
 */
export default async function DriversPage() {
  await requireStaff();
  const drivers = await listDrivers();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="STAFF" title="Drivers" description="Look up a driver's contact info and status." />
      <DriversLookupList drivers={drivers} />
    </div>
  );
}
