import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { getBusinessOverview } from "@/lib/business-overview";

export const metadata: Metadata = { title: "Business Overview" };

const TIER_LABELS: Record<string, string> = {
  route: "Route",
  private: "Private",
  estate: "Estate",
};

/**
 * The Super Admin landing page (approved UX blueprint, Phase 5) —
 * business health, not today's operations (that's the Staff Overview
 * at /internal/dispatch, one level up). Occupies the plain /admin URL;
 * staff/driver account management moved to /admin/team to make room.
 */
export default async function BusinessOverviewPage() {
  const data = await getBusinessOverview();
  const tierEntries = Object.entries(data.memberships.byTier);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="SUPER ADMIN"
        title="Business Overview"
        description="The health of the business, not today's to-do list — see Overview for that."
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card padding="sm">
          <StatTile label="Customers" value={data.customers.total} />
        </Card>
        <Card padding="sm">
          <StatTile label="Active Drivers" value={data.team.activeDrivers} />
        </Card>
        <Card padding="sm">
          <StatTile label="Active Staff" value={data.team.activeStaff} />
        </Card>
        <Card padding="sm">
          <StatTile label="Active Memberships" value={data.memberships.active} />
        </Card>
        <Card padding="sm">
          <StatTile label="Completed (lifetime)" value={data.fulfillment.lifetimeCompleted} />
        </Card>
        <Card padding="sm">
          <StatTile label="Failed (last 72h)" value={data.fulfillment.recentFailed} />
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="sm">
          <StatTile label="Revenue, last 7 days" value={`$${(data.revenue.last7DaysCents / 100).toFixed(2)}`} />
        </Card>
        <Card padding="sm">
          <StatTile label="Revenue, lifetime" value={`$${(data.revenue.lifetimeCents / 100).toFixed(2)}`} />
        </Card>
      </div>

      {tierEntries.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-serif text-lg text-navy-deep">Active Memberships by Tier</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {tierEntries.map(([tier, n]) => (
              <Card key={tier} padding="sm">
                <StatTile label={TIER_LABELS[tier] ?? tier} value={n} />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <p className="font-sans text-xs text-charcoal/50">
        Disabled staff/driver counts and account management live under Team. Revenue trends, driver
        utilization, and cancellation-rate analytics aren&apos;t shown here — there&apos;s no historical
        baseline stored anywhere yet to compare a number against, so nothing here is a fabricated chart.
      </p>
    </div>
  );
}
