import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WorkQueueBoard } from "@/components/dispatch/WorkQueueBoard";
import { getWorkQueue, WORK_QUEUE_TABS, type WorkQueueBucket } from "@/lib/work-queue";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Work Queue" };

/**
 * The unified Work Queue (approved blueprint) — replaces this same URL's
 * old "Dispatch Queue" content (paid+ only) and absorbs
 * /internal/dispatch/concierge's quote-stage content, which now
 * redirects here. Same route, new scope: every service, tabbed by what
 * staff needs to do next rather than split across two pages.
 */
export default async function WorkQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Re-checked here, not just relied on via DispatchLayout — this page
  // queries every customer's order/PII data directly.
  await requireStaff();
  const { tab } = await searchParams;
  const initialTab = WORK_QUEUE_TABS.some((t) => t.key === tab) ? (tab as WorkQueueBucket) : undefined;

  const db = getDb();
  const [items, activeDrivers] = await Promise.all([
    getWorkQueue(),
    db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.isActive, true)),
  ]);
  const driverOptions = activeDrivers.map((d) => ({ value: d.id, label: d.name }));

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Work Queue"
        description="Every request and order, one place — tabbed by what needs to happen next."
      />
      <WorkQueueBoard items={items} driverOptions={driverOptions} initialTab={initialTab} />
    </div>
  );
}
