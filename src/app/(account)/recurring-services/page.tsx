import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import {
  getOwnRecurringServicePlans,
  pauseRecurringServicePlan,
  resumeRecurringServicePlan,
  cancelRecurringServicePlan,
} from "@/lib/actions/recurring-service-plans";

export const metadata: Metadata = {
  title: "Recurring Services",
  description: "Standing shop-for-you requests on a schedule.",
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  canceled: "Canceled",
};

export default async function RecurringServicesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const plans = await getOwnRecurringServicePlans(ownerId);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="Recurring Services"
          description="Standing shop-for-you requests — a new order is created for you to review and pay on the schedule you set. Never charged automatically."
        />
        <Button href="/recurring-services/new" variant="navy">
          New Recurring Request
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">You haven&apos;t set up a recurring request yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg text-navy-deep">
                    {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency}
                  </p>
                  <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-gold">
                    {STATUS_LABELS[plan.status] ?? plan.status}
                  </span>
                </div>
              </div>
              <p className="font-sans text-sm text-charcoal/70">
                {plan.deliveryAddressLine1}, {plan.deliveryCity}, {plan.deliveryState}
              </p>
              {plan.items.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {plan.items.map((item, i) => (
                    <li key={i} className="font-sans text-xs text-charcoal/60">
                      {item.itemName} — {item.quantity}
                    </li>
                  ))}
                </ul>
              ) : null}
              {plan.status === "active" ? (
                <p className="font-sans text-xs text-charcoal/60">
                  Next order: {new Date(plan.nextRunAt).toLocaleDateString()}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 border-t border-navy/10 pt-3">
                {plan.status === "active" ? (
                  <form action={pauseRecurringServicePlan.bind(null, plan.id)}>
                    <Button type="submit" variant="outline-dark" size="md">
                      Pause
                    </Button>
                  </form>
                ) : null}
                {plan.status === "paused" ? (
                  <form action={resumeRecurringServicePlan.bind(null, plan.id)}>
                    <Button type="submit" variant="outline-dark" size="md">
                      Resume
                    </Button>
                  </form>
                ) : null}
                {plan.status !== "canceled" ? (
                  <form action={cancelRecurringServicePlan.bind(null, plan.id)}>
                    <Button type="submit" variant="outline-dark" size="md">
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
