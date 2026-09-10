"use server";

import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { customerPlaces, customerProfiles, memberships, orders, serviceRequests } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { getHouseholdData } from "@/lib/household";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

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

/**
 * Used by the Edit Customer page — the raw customer_profiles row, or
 * all-null defaults for a customer with no profile row yet (see this
 * file's own doc comment on getCustomerDetail for why that's a normal
 * state). Deliberately not getCustomerDetail's own name/phone fields:
 * those fall back to an order snapshot when there's no profile, which
 * is right for *display* but wrong for an edit form's defaults — a
 * value pulled from an old order should never look like it's already
 * saved to the profile when it isn't.
 */
export async function getCustomerProfileForEdit(authUserId: string) {
  await requireSuperAdmin();
  const db = getDb();
  const rows = await db.select().from(customerProfiles).where(eq(customerProfiles.authUserId, authUserId));
  return (
    rows[0] ?? {
      name: null,
      phone: null,
      defaultDeliveryAddressLine1: null,
      defaultDeliveryAddressLine2: null,
      defaultDeliveryCity: null,
      defaultDeliveryState: null,
      defaultDeliveryZip: null,
    }
  );
}

/**
 * Bound as `updateCustomerProfileAsAdmin.bind(null, authUserId)` — the
 * one place a super admin can correct a customer's saved profile
 * fields on their behalf (email is deliberately excluded: that's login
 * identity, not a profile field, and changing it is a bigger, separate
 * decision this doesn't make casually). Reuses profileUpdateSchema
 * unchanged — same fields, same validation as the customer's own
 * self-service /profile page. Every save is logged to admin_audit_log
 * with the full before/after, unconditionally — this is exactly the
 * kind of action the master implementation directive's Priority 9
 * flagged as needing one ("if authorized staff needs to modify
 * customer information, provide a separate explicit customer-edit
 * workflow... consider audit logging important customer-data
 * changes").
 */
export async function updateCustomerProfileAsAdmin(
  authUserId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    defaultDeliveryAddressLine1: formData.get("defaultDeliveryAddressLine1"),
    defaultDeliveryAddressLine2: formData.get("defaultDeliveryAddressLine2"),
    defaultDeliveryCity: formData.get("defaultDeliveryCity"),
    defaultDeliveryState: formData.get("defaultDeliveryState"),
    defaultDeliveryZip: formData.get("defaultDeliveryZip"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const data = parsed.data;
  const db = getDb();

  try {
    const beforeRows = await db.select().from(customerProfiles).where(eq(customerProfiles.authUserId, authUserId));
    const before = beforeRows[0] ?? null;

    await db
      .insert(customerProfiles)
      .values({ authUserId, ...data })
      .onConflictDoUpdate({
        target: customerProfiles.authUserId,
        set: { ...data, updatedAt: new Date() },
      });

    await logAdminAuditEvent({
      actorStaffId: admin.id,
      action: "customer_profile_updated",
      targetType: "customer_profile",
      targetId: authUserId,
      before,
      after: data,
    });
  } catch (error) {
    console.error("[updateCustomerProfileAsAdmin] failed", error);
    return {
      ok: false,
      message: "We couldn't save this customer's profile right now. Please try again shortly.",
    };
  }

  revalidatePath(`/internal/dispatch/admin/customers/${authUserId}`);
  revalidatePath(`/internal/dispatch/admin/customers/${authUserId}/edit`);
  return { ok: true };
}
