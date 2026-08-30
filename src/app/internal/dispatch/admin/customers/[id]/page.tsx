import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { getCustomerDetail } from "@/lib/actions/customer-detail";
import { MEMBERSHIP_TIERS } from "@/lib/stripe/tiers";

export const metadata: Metadata = { title: "Customer Profile" };

const MEMBERSHIP_TIER_NAMES = Object.fromEntries(MEMBERSHIP_TIERS.map((t) => [t.tier, t.name]));

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Called directly here, not just relied on via the shared layout —
  // same discipline as every other admin sub-page in this codebase.
  await requireSuperAdmin();
  const { id } = await params;

  const customer = await getCustomerDetail(id);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title={customer.name ?? "Unnamed Customer"}
        description={customer.email ?? "(no email on file)"}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Orders</p>
          <p className="font-serif text-2xl text-navy-deep">{customer.stats.orderCount}</p>
        </Card>
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Total Spent</p>
          <p className="font-serif text-2xl text-navy-deep">
            ${(customer.stats.totalSpentCents / 100).toFixed(2)}
          </p>
        </Card>
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Membership</p>
          <p className="font-serif text-2xl text-navy-deep">
            {customer.membership
              ? `${MEMBERSHIP_TIER_NAMES[customer.membership.tier] ?? customer.membership.tier}${customer.membership.status !== "active" ? ` (${customer.membership.status})` : ""}`
              : "None"}
          </p>
        </Card>
        <Card padding="sm">
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-charcoal/50">Household</p>
          <p className="font-serif text-2xl text-navy-deep">
            {customer.household.ownedMembers.length > 0
              ? `${customer.household.ownedMembers.length} member${customer.household.ownedMembers.length === 1 ? "" : "s"}`
              : "Just them"}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-2 rounded-sm border border-navy/10 bg-white/60 p-6">
        <p className="font-sans text-sm text-navy-deep">
          {customer.phone ?? "No phone on file"}
          {customer.stats.customerSince
            ? ` · Customer since ${new Date(customer.stats.customerSince).toLocaleDateString()}`
            : ""}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Places</h3>
        {customer.places.length === 0 ? (
          <EmptyState message="No saved places." />
        ) : (
          <RowList>
            {customer.places.map((place) => (
              <Row key={place.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">
                    {place.label}
                    {place.isDefault ? " · Default" : ""}
                  </p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {place.addressLine1}, {place.city}, {place.state} {place.zip}
                  </p>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Household</h3>
        {customer.household.ownedMembers.length === 0 ? (
          <EmptyState message="No household members — this account acts alone." />
        ) : (
          <RowList>
            {customer.household.ownedMembers.map((member) => (
              <Row key={member.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{member.memberEmail}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {member.status} · {member.role.replace("_", " ")}
                  </p>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Orders</h3>
        {customer.orders.length === 0 ? (
          <EmptyState message="No orders yet." />
        ) : (
          <RowList>
            {customer.orders.map((order) => {
              const inner = (
                <>
                  <div>
                    <p className="font-sans text-sm text-navy-deep">
                      {order.serviceType === "concierge" ? "Concierge Order" : "City Pickup"}
                      {" · "}${(order.totalCents / 100).toFixed(2)}
                    </p>
                    <p className="font-sans text-xs text-charcoal/60">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </>
              );
              // Only concierge orders have a staff-facing detail page to
              // link to today — a plain (City Pickup) order has none,
              // so it renders the same content without a link rather
              // than pointing somewhere that 404s.
              return order.serviceType === "concierge" ? (
                <Row key={order.id} href={`/internal/dispatch/concierge/${order.id}`}>
                  {inner}
                </Row>
              ) : (
                <Row key={order.id}>{inner}</Row>
              );
            })}
          </RowList>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-navy-deep">Service Requests</h3>
        <p className="font-sans text-xs text-charcoal/50">
          Matched by email — leads never carry an account link, so this may miss a request submitted from a
          different address.
        </p>
        {customer.serviceRequests.length === 0 ? (
          <EmptyState message="No service requests on file." />
        ) : (
          <RowList>
            {customer.serviceRequests.map((request) => (
              <Row key={request.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{request.serviceType}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-sans text-xs text-charcoal/60">{request.status}</span>
              </Row>
            ))}
          </RowList>
        )}
      </section>

      <Link href="/internal/dispatch/queue" className="font-sans text-sm text-gold hover:text-gold-light">
        ← Back to Dispatch Queue
      </Link>
    </div>
  );
}
