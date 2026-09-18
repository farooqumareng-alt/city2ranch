import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CustomersLookupList } from "@/components/dispatch/CustomersLookupList";
import { listCustomersForLookup } from "@/lib/actions/customer-detail";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Customers" };

/**
 * Any-staff read-only lookup (2026-09-18) — same redesign ask as
 * /internal/dispatch/drivers. Before this, the only way to find a
 * customer at all was clicking "View Customer" from a specific order;
 * there was no way to look one up directly. Only customers who've
 * placed at least one real order appear — see
 * listCustomersForLookup()'s own doc comment.
 */
export default async function CustomersPage() {
  await requireStaff();
  const rows = await listCustomersForLookup();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Customers"
        description="Look up a customer's orders, addresses, and account details."
      />
      <CustomersLookupList
        customers={rows
          .filter((r) => r.authUserId != null)
          .map((r) => ({
            authUserId: r.authUserId as string,
            name: r.name,
            email: r.email,
            phone: r.phone,
            orderCount: Number(r.orderCount),
            lastOrderAt: new Date(r.lastOrderAt).toISOString(),
          }))}
      />
    </div>
  );
}
