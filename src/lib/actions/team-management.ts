"use server";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { drivers, orders, staff } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { addDriverSchema, addStaffSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const ADMIN_PATH = "/internal/dispatch/admin";
const NO_ACCOUNT_MESSAGE =
  "No account exists for that email yet — they need to sign in to City2Ranch at least once, then try adding them again.";

/**
 * Reverse of src/lib/household.ts's ownerEmailSubquery() (that one goes
 * id -> email; this goes email -> id). schema.ts's authUsers shadow
 * table deliberately only exports `id` (so drizzle-kit doesn't think it
 * owns Supabase's real auth.users table), so this stays a raw db.execute()
 * call, never a Drizzle-managed join — same discipline as household.ts.
 *
 * Returns the row array directly, not `.rows[0]` — that's node-postgres's
 * shape, not this project's actual driver (drizzle-orm/postgres-js),
 * verified against a live query before writing this.
 */
async function findAuthUserIdByEmail(
  db: ReturnType<typeof getDb>,
  email: string
): Promise<string | undefined> {
  const rows = await db.execute<{ id: string }>(
    sql`SELECT id FROM auth.users WHERE lower(email) = lower(${email})`
  );
  return rows[0]?.id;
}

/** `count(*) from staff where role = 'super_admin' and is_active = true`,
 *  optionally excluding one row — the exact query both the demote and
 *  disable safety rails below need, since they have the identical
 *  "would this bring active super-admins to zero" failure mode. */
async function activeSuperAdminCount(
  db: ReturnType<typeof getDb>,
  excludeStaffId?: string
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(staff)
    .where(
      excludeStaffId
        ? and(eq(staff.role, "super_admin"), eq(staff.isActive, true), ne(staff.id, excludeStaffId))
        : and(eq(staff.role, "super_admin"), eq(staff.isActive, true))
    );
  return rows[0]?.n ?? 0;
}

/** Used by /internal/dispatch/admin's Staff table. */
export async function listStaff() {
  await requireSuperAdmin();
  const db = getDb();
  return db
    .select({
      id: staff.id,
      label: staff.label,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${staff.authUserId})`,
    })
    .from(staff)
    .orderBy(staff.createdAt);
}

/** Used by /internal/dispatch/admin's Drivers table. */
export async function listDrivers() {
  await requireSuperAdmin();
  const db = getDb();
  return db
    .select({
      id: drivers.id,
      name: drivers.name,
      phone: drivers.phone,
      isActive: drivers.isActive,
      createdAt: drivers.createdAt,
      email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${drivers.authUserId})`,
    })
    .from(drivers)
    .orderBy(drivers.createdAt);
}

/**
 * Used by /internal/dispatch/admin/drivers/[id] — everything listDrivers()
 * doesn't have: the driver's full assignment history (every order ever
 * assigned to them, any status — not just the active ones their own
 * /internal/driver page shows) and honest performance stats. No ratings,
 * no on-time %, no availability — nothing in this schema collects any
 * of that; only what's actually computable from real columns
 * (assignedAt/completedAt) is included.
 */
export async function getDriverDetail(driverId: string) {
  await requireSuperAdmin();
  const db = getDb();

  const [driverRows, assignmentHistory, statsRows] = await Promise.all([
    db
      .select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        label: drivers.label,
        isActive: drivers.isActive,
        createdAt: drivers.createdAt,
        email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${drivers.authUserId})`,
      })
      .from(drivers)
      .where(eq(drivers.id, driverId)),

    db
      .select({
        id: orders.id,
        status: orders.status,
        serviceType: orders.serviceType,
        customerName: orders.customerName,
        assignedAt: orders.assignedAt,
        completedAt: orders.completedAt,
      })
      .from(orders)
      .where(eq(orders.driverId, driverId))
      .orderBy(desc(orders.assignedAt))
      .limit(50),

    // avg() only over completed orders with both timestamps set — a
    // cancelled-before-pickup or still-in-flight order has no
    // meaningful duration to average in.
    db
      .select({
        completedCount: sql<number>`count(*) filter (where ${orders.status} = 'completed')`,
        failedCount: sql<number>`count(*) filter (where ${orders.status} = 'failed')`,
        avgDurationSeconds: sql<string | null>`avg(extract(epoch from (${orders.completedAt} - ${orders.assignedAt}))) filter (where ${orders.status} = 'completed')`,
      })
      .from(orders)
      .where(eq(orders.driverId, driverId)),
  ]);

  const driver = driverRows[0];
  if (!driver) return null;

  const avgDurationSeconds = statsRows[0]?.avgDurationSeconds;
  return {
    driver,
    assignmentHistory,
    stats: {
      completedCount: Number(statsRows[0]?.completedCount ?? 0),
      failedCount: Number(statsRows[0]?.failedCount ?? 0),
      avgDeliveryHours: avgDurationSeconds ? Number(avgDurationSeconds) / 3600 : null,
    },
  };
}

export async function addStaffMember(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = addStaffSchema.safeParse({
    email: formData.get("email"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, ["email", "label"]),
    };
  }

  const db = getDb();
  try {
    const authUserId = await findAuthUserIdByEmail(db, parsed.data.email);
    if (!authUserId) {
      return { ok: false, message: NO_ACCOUNT_MESSAGE, values: valuesFromFormData(formData, ["email", "label"]) };
    }

    const existing = await db.select({ id: staff.id }).from(staff).where(eq(staff.authUserId, authUserId));
    if (existing[0]) {
      return {
        ok: false,
        message: "That person is already a staff member.",
        values: valuesFromFormData(formData, ["email", "label"]),
      };
    }

    await db.insert(staff).values({ authUserId, label: parsed.data.label });
  } catch (error) {
    console.error("[addStaffMember] failed", error);
    return {
      ok: false,
      message: "We couldn't add that staff member right now. Please try again shortly.",
      values: valuesFromFormData(formData, ["email", "label"]),
    };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function addDriver(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = addDriverSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, ["email", "name", "phone"]),
    };
  }

  const db = getDb();
  try {
    const authUserId = await findAuthUserIdByEmail(db, parsed.data.email);
    if (!authUserId) {
      return {
        ok: false,
        message: NO_ACCOUNT_MESSAGE,
        values: valuesFromFormData(formData, ["email", "name", "phone"]),
      };
    }

    const existing = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.authUserId, authUserId));
    if (existing[0]) {
      return {
        ok: false,
        message: "That person is already a driver.",
        values: valuesFromFormData(formData, ["email", "name", "phone"]),
      };
    }

    await db.insert(drivers).values({ authUserId, name: parsed.data.name, phone: parsed.data.phone });
  } catch (error) {
    console.error("[addDriver] failed", error);
    return {
      ok: false,
      message: "We couldn't add that driver right now. Please try again shortly.",
      values: valuesFromFormData(formData, ["email", "name", "phone"]),
    };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/**
 * Bound to a role-toggle form as `setStaffRole.bind(null, staffId)` —
 * the leading-bound-id convention used everywhere in this codebase
 * (approveAndPayOrder.bind(null, order.id), etc.), extended just enough
 * to still compose with useActionState: the target role travels in
 * FormData (a hidden input), not as a second positional bound arg,
 * since useActionState always calls a bound action as
 * (prevState, formData) — a second bound literal would shift those
 * arguments by one and silently break.
 *
 * Demoting a super_admin to plain staff is blocked if it would leave
 * zero active super_admins — this is also, incidentally, self-lockout
 * prevention: a solo super_admin demoting themselves hits the exact
 * same "would this hit zero" check as demoting anyone else. No
 * separate "is this me" special case needed or wanted.
 */
export async function setStaffRole(
  staffId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();
  const role = formData.get("role") === "super_admin" ? "super_admin" : "staff";
  const db = getDb();

  if (role === "staff") {
    const remaining = await activeSuperAdminCount(db, staffId);
    if (remaining === 0) {
      return { ok: false, message: "You can't remove the last super admin. Promote someone else first." };
    }
  }

  try {
    await db.update(staff).set({ role }).where(eq(staff.id, staffId));
  } catch (error) {
    console.error("[setStaffRole] failed", error);
    return { ok: false, message: "We couldn't update that role right now. Please try again shortly." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/** Bound to an active-toggle form as `setStaffActive.bind(null, staffId)`
 *  — same leading-bound-id + FormData-carried-value shape as
 *  setStaffRole above, and the same last-super-admin rail: disabling a
 *  super_admin has the identical "would this hit zero" failure mode as
 *  demoting one. */
export async function setStaffActive(
  staffId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();
  const isActive = formData.get("isActive") === "true";
  const db = getDb();

  if (!isActive) {
    const target = await db.select({ role: staff.role }).from(staff).where(eq(staff.id, staffId));
    if (target[0]?.role === "super_admin") {
      const remaining = await activeSuperAdminCount(db, staffId);
      if (remaining === 0) {
        return { ok: false, message: "You can't disable the last super admin. Promote or enable someone else first." };
      }
    }
  }

  try {
    await db.update(staff).set({ isActive }).where(eq(staff.id, staffId));
  } catch (error) {
    console.error("[setStaffActive] failed", error);
    return { ok: false, message: "We couldn't update that account right now. Please try again shortly." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/** Bound to an active-toggle form as `setDriverActive.bind(null, driverId)`. */
export async function setDriverActive(
  driverId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();
  const isActive = formData.get("isActive") === "true";
  const db = getDb();

  try {
    await db.update(drivers).set({ isActive }).where(eq(drivers.id, driverId));
  } catch (error) {
    console.error("[setDriverActive] failed", error);
    return { ok: false, message: "We couldn't update that driver right now. Please try again shortly." };
  }

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
