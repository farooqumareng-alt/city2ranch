import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { getDriverDetail } from "@/lib/actions/team-management";

export const metadata: Metadata = { title: "Driver Profile" };

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // requireSuperAdmin() called directly here, not just relied on via
  // DispatchLayout (requireStaff() only) or even admin/page.tsx's own
  // gate — matches every admin sub-page's discipline of re-checking
  // itself rather than trusting the layout above it.
  await requireSuperAdmin();
  const { id } = await params;

  const detail = await getDriverDetail(id);
  if (!detail) notFound();

  const { driver, assignmentHistory, stats } = detail;

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title={driver.name}
        description={driver.email ?? "(no email on file)"}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Completed</p>
          <p className="font-serif text-2xl text-navy-deep">{stats.completedCount}</p>
        </Card>
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Failed</p>
          <p className="font-serif text-2xl text-navy-deep">{stats.failedCount}</p>
        </Card>
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">
            Avg. Time to Delivery
          </p>
          <p className="font-serif text-2xl text-navy-deep">
            {stats.avgDeliveryHours !== null ? `${stats.avgDeliveryHours.toFixed(1)}h` : "—"}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-2 rounded-sm border border-navy/10 bg-white/60 p-6">
        <p className="font-sans text-sm text-navy-deep">
          {driver.phone ?? "No phone on file"}
          {driver.label ? ` · ${driver.label}` : ""}
        </p>
        <p className="font-sans text-xs text-charcoal/60">
          {driver.isActive ? "Active" : "Disabled"} · Added{" "}
          {new Date(driver.createdAt).toLocaleDateString()}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Assignment History</h3>
        {assignmentHistory.length === 0 ? (
          <EmptyState message="No orders assigned to this driver yet." />
        ) : (
          <RowList>
            {assignmentHistory.map((order) => (
              <Row key={order.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">
                    {order.customerName} — {order.serviceType === "concierge" ? "Concierge" : "City Pickup"}
                  </p>
                  <p className="font-sans text-xs text-charcoal/60">
                    Assigned {order.assignedAt ? new Date(order.assignedAt).toLocaleString() : "—"}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Row>
            ))}
          </RowList>
        )}
      </section>
    </div>
  );
}
