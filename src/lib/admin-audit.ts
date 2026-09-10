import { and, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { adminAuditLog, staff } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import type * as schema from "@/lib/db/schema";

/** Satisfied by both getDb()'s pooled connection and a db.transaction()
 *  callback's `tx` — same convention as my-services.ts's AnyDb. */
type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema>;

type AdminAuditInput = {
  actorStaffId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/**
 * One reusable insert for any admin action worth a paper trail — first
 * used by updateCustomerProfileAsAdmin() (customer-detail.ts), meant to
 * be reused by a future RBAC change too (same reasoning as the doc
 * comment on the admin_audit_log table itself: one general-purpose log,
 * not a new table per feature). Takes an optional `db` so a caller
 * already inside a transaction can pass it through, same convention as
 * logAuditEvent() in src/lib/audit.ts.
 */
export async function logAdminAuditEvent(input: AdminAuditInput, db: AnyDb = getDb()): Promise<void> {
  await db.insert(adminAuditLog).values({
    actorStaffId: input.actorStaffId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}

/** Used by the customer detail admin page's "Edit History" section —
 *  every admin_audit_log entry for one target, newest first, with the
 *  acting staff member's email resolved for display (raw auth.users
 *  subquery — same pattern as household.ts's ownerEmailSubquery, for
 *  the same reason: auth.users isn't a Drizzle-exported table). Takes
 *  an optional `db` for the same reason logAdminAuditEvent() does — so
 *  a deep test can exercise both against real, rolled-back rows in one
 *  transaction instead of only reading production data. */
export async function getAdminAuditLogFor(targetType: string, targetId: string, db: AnyDb = getDb()) {
  return db
    .select({
      id: adminAuditLog.id,
      createdAt: adminAuditLog.createdAt,
      action: adminAuditLog.action,
      before: adminAuditLog.before,
      after: adminAuditLog.after,
      actorLabel: staff.label,
      actorEmail: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${staff.authUserId})`,
    })
    .from(adminAuditLog)
    .leftJoin(staff, eq(adminAuditLog.actorStaffId, staff.id))
    .where(and(eq(adminAuditLog.targetType, targetType), eq(adminAuditLog.targetId, targetId)))
    .orderBy(desc(adminAuditLog.createdAt));
}
