import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOwnServiceRequests } from "@/lib/requests";
import { SERVICE_TYPE_OPTIONS } from "@/lib/constants";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "My Requests",
  description: "Everything you've asked your City2Ranch concierge for.",
};

// Customer-facing wording for service_requests.status — distinct from
// the internal "new/contacted/converted/closed" pipeline language staff
// sees, and from ORDER_STATUS_LABELS (a request isn't an order yet).
const REQUEST_STATUS_LABELS: Record<string, string> = {
  new: "Received — awaiting review",
  contacted: "Your concierge is in touch",
  converted: "Quote in progress",
  closed: "Closed",
};

const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const requests = await getOwnServiceRequests(user.email);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="My Requests"
          description="Everything you've asked your concierge for, from first request to final delivery."
        />
        <Button href="/request-service" variant="navy">
          Request Service
        </Button>
      </div>

      {requests.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          You haven&apos;t submitted a request yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
          {requests.map((req) => (
            <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-serif text-base text-navy-deep">
                  {SERVICE_TYPE_LABELS[req.serviceType] ?? req.serviceType}
                </p>
                <p className="font-sans text-xs text-charcoal/60">
                  Submitted {new Date(req.createdAt).toLocaleDateString()}
                  {req.requestedDeliveryDate
                    ? ` · Requested for ${formatPlainDate(req.requestedDeliveryDate)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-sans text-sm text-charcoal/70">
                  {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                </span>
                {req.orderId ? (
                  // Always to the list, not /orders/[id] directly — the
                  // resulting order may still be unclaimed (see
                  // claim-order.ts), and that detail page 404s on anyone
                  // but its exact owner. The list surfaces an unclaimed
                  // order via email match with a "This is my order"
                  // button, so this link never dead-ends.
                  <Link
                    href="/orders"
                    className="font-sans text-sm font-medium text-navy-deep underline decoration-gold/50 underline-offset-4 hover:text-gold"
                  >
                    View order
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
