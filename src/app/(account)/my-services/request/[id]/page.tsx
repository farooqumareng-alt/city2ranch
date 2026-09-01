import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { serviceRequests, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwner } from "@/lib/household";
import { REQUEST_STATUS_LABELS } from "@/lib/requests";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "Service Request" };

/**
 * The pre-conversion half of Service Detail (approved blueprint,
 * Decision 1): a service_requests row has no items/price/messages yet
 * — this is deliberately lighter than /my-services/[id], not a
 * stripped-down copy of it. Once staff converts the request into an
 * order (orders.service_request_id gets set), this same id starts
 * redirecting to the real Service Detail instead.
 */
export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: serviceRequests.id,
      createdAt: serviceRequests.createdAt,
      email: serviceRequests.email,
      preferredStore: serviceRequests.preferredStore,
      shoppingList: serviceRequests.shoppingList,
      timingPreference: serviceRequests.timingPreference,
      requestedDeliveryDate: serviceRequests.requestedDeliveryDate,
      notes: serviceRequests.notes,
      status: serviceRequests.status,
      orderId: orders.id,
    })
    .from(serviceRequests)
    .leftJoin(orders, eq(orders.serviceRequestId, serviceRequests.id))
    .where(eq(serviceRequests.id, id));

  const request = rows[0];
  const owner = await getEffectiveOwner(user.id, user.email);

  // service_requests has no auth_user_id column (guest-open by design —
  // see its schema comment) — matched by the owner's email, same
  // ownership rule getOwnServiceRequests already uses everywhere else.
  if (!request || request.email.toLowerCase() !== owner.email.toLowerCase()) notFound();

  // Already converted since the customer last looked — send them to the
  // real Service Detail rather than showing this stale pre-quote view.
  if (request.orderId) redirect(`/my-services/${request.orderId}`);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        eyebrow={REQUEST_STATUS_LABELS[request.status] ?? "Under review"}
        title="Concierge Shopping"
        description={`Submitted ${new Date(request.createdAt).toLocaleString()}`}
      />

      <div className="flex flex-col gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
        <p className="font-sans text-sm text-charcoal/70">
          A City2Ranch concierge is reviewing your request. You&apos;ll see a
          quote here — and get an email — once it&apos;s ready to approve.
        </p>
        {request.preferredStore ? (
          <div>
            <h3 className="font-serif text-base text-navy-deep">Preferred Store</h3>
            <p className="font-sans text-sm text-charcoal/70">{request.preferredStore}</p>
          </div>
        ) : null}
        {request.shoppingList ? (
          <div>
            <h3 className="font-serif text-base text-navy-deep">Shopping List</h3>
            <p className="whitespace-pre-wrap font-sans text-sm text-charcoal/70">{request.shoppingList}</p>
          </div>
        ) : null}
        {request.requestedDeliveryDate ? (
          <div>
            <h3 className="font-serif text-base text-navy-deep">Requested For</h3>
            <p className="font-sans text-sm text-charcoal/70">{formatPlainDate(request.requestedDeliveryDate)}</p>
          </div>
        ) : null}
        {request.notes ? (
          <div>
            <h3 className="font-serif text-base text-navy-deep">Notes</h3>
            <p className="whitespace-pre-wrap font-sans text-sm text-charcoal/70">{request.notes}</p>
          </div>
        ) : null}
      </div>

      <Button href="/support" variant="outline-dark" className="self-start">
        Contact City2Ranch
      </Button>
    </div>
  );
}
