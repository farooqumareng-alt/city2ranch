import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerPlaces, customerProfiles, memberships, orders, serviceRequests } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { getHouseholdData } from "@/lib/household";

/**
 * Used by /internal/dispatch/admin/customers/[id] — everything about one
 * customer in one place. Keyed directly by orders.authUserId: when that
 * column is set, it's already the resolved household-owner id (see
 * submit-order.ts's getEffectiveOwner() usage), not a raw member id, so
 * no extra owner-resolution step is needed here the way account-side
 * pages need getEffectiveOwnerId().
 *
 * customerProfiles is deliberately left-checked, not assumed to exist —
 * a customer can have real orders with zero profile row (a profile is
 * only created the first time someone saves one, see
 * src/lib/customer-profile.ts's doc comment). Name/email/phone fall
 * back through: profile -> the most recent order's own snapshot fields
 * -> a raw auth.users lookup, in that order.
 */
export async function getCustomerDetail(authUserId: string) {
  await requireSuperAdmin();
  const db = getDb();

  const [profileRows, orderHistory, places] = await Promise.all([
    db
      .select({
        name: customerProfiles.name,
        phone: customerProfiles.phone,
        createdAt: customerProfiles.createdAt,
        email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${customerProfiles.authUserId})`,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.authUserId, authUserId)),

    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
        paidAt: orders.paidAt,
        // Snapshot fields — the name/email/phone fallback below for a
        // customer with no customerProfiles row at all.
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
      })
      .from(orders)
      .where(eq(orders.authUserId, authUserId))
      .orderBy(desc(orders.createdAt)),

    db.select().from(customerPlaces).where(eq(customerPlaces.authUserId, authUserId)),
  ]);

  const profile = profileRows[0] ?? null;
  const mostRecentOrder = orderHistory[0] ?? null;
  const oldestOrder = orderHistory[orderHistory.length - 1] ?? null;

  let email: string | null = profile?.email ?? mostRecentOrder?.customerEmail ?? null;
  if (!email) {
    const rows = await db.execute<{ email: string | null }>(
      sql`SELECT email FROM auth.users WHERE id = ${authUserId}`
    );
    email = rows[0]?.email ?? null;
  }

  const [household, membershipRows, requests] = await Promise.all([
    getHouseholdData(authUserId, email ?? ""),
    db.select().from(memberships).where(eq(memberships.authUserId, authUserId)),
    // service_requests has no authUserId column at all (a guest-open lead
    // form, by design) — best-effort match by email, not a real FK.
    email
      ? db
          .select()
          .from(serviceRequests)
          .where(sql`lower(${serviceRequests.email}) = lower(${email})`)
          .orderBy(desc(serviceRequests.createdAt))
      : Promise.resolve([]),
  ]);

  const totalSpentCents = orderHistory
    .filter((o) => o.paidAt !== null)
    .reduce((sum, o) => sum + o.totalCents, 0);

  return {
    authUserId,
    name: profile?.name ?? mostRecentOrder?.customerName ?? null,
    email,
    phone: profile?.phone ?? mostRecentOrder?.customerPhone ?? null,
    places,
    household,
    membership: membershipRows[0] ?? null,
    orders: orderHistory,
    serviceRequests: requests,
    stats: {
      orderCount: orderHistory.length,
      totalSpentCents,
      // Earliest order, since orderHistory is ordered newest-first; falls
      // back to the profile's own createdAt, or null if neither exists
      // (never fabricate a date from nothing).
      customerSince: oldestOrder?.createdAt ?? profile?.createdAt ?? null,
    },
  };
}
