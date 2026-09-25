"use server";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { drivers, orders, staff } from "@/lib/db/schema";
import { requireStaff, requireSuperAdmin } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getResend } from "@/lib/email/resend";
import { driverAddedEmail } from "@/lib/email/templates";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { addDriverSchema, addStaffSchema, driverHiringInfoSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

// Moved to /admin/team when Business Overview took over the plain
// /admin URL (approved UX blueprint, Phase 5) — the page every one of
// these actions actually affects.
const ADMIN_PATH = "/internal/dispatch/admin/team";
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

/**
 * Locks every currently-active super_admin row (FOR UPDATE) and returns
 * how many remain after optionally excluding one — the exact query both
 * the demote and disable safety rails below need, since they have the
 * identical "would this bring active super-admins to zero" failure
 * mode. Must be called inside a db.transaction(); the lock is what
 * actually closes the race, not the count by itself — a plain SELECT
 * (even re-run) doesn't stop two concurrent transactions from both
 * reading "1 remaining" before either writes. Can't use count(*)/
 * .for("update") together (Postgres rejects FOR UPDATE with an
 * aggregate), so this counts the locked rows in JS instead.
 */
async function activeSuperAdminCount(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  excludeStaffId?: string
): Promise<number> {
  const rows = await tx
    .select({ id: staff.id })
    .from(staff)
    .where(
      excludeStaffId
        ? and(eq(staff.role, "super_admin"), eq(staff.isActive, true), ne(staff.id, excludeStaffId))
        : and(eq(staff.role, "super_admin"), eq(staff.isActive, true))
    )
    .for("update");
  return rows.length;
}

/**
 * Used by /internal/dispatch/admin/team's Staff table. lastSignInAt
 * (2026-09-18, panel redesign) added for the simplified table's "Last
 * Login" column — same raw auth.users subquery convention already used
 * for email everywhere in this codebase (auth.users isn't a Drizzle-
 * exported table).
 */
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
      lastSignInAt: sql<string | null>`(SELECT last_sign_in_at FROM auth.users WHERE id = ${staff.authUserId})`,
    })
    .from(staff)
    .orderBy(staff.createdAt);
}

// Same set the driver's own "Today's Jobs" page
// (src/app/internal/driver/page.tsx) already uses to decide what counts
// as a driver's current queue — not calendar-day-bound (an order offered
// at 11pm and finished at 1am is still "today's job" from the driver's
// side), just "not yet terminal." pending_acceptance included: an
// offered-but-not-yet-accepted job is still sitting in that driver's
// queue, same as ACTIVE_DRIVING_STATUSES (operations-dashboard.ts) plus
// the one pre-acceptance state that dashboard deliberately excludes for
// its own different purpose (driversOutNow — someone who hasn't
// accepted yet isn't "out" driving).
const DRIVER_QUEUE_STATUSES = ["pending_acceptance", "driver_assigned", "picked_up", "in_transit"] as const;
// sql.join, not a raw interpolated array — drizzle's sql`` tag doesn't
// decompose a JS array into an IN-list on its own (it would bind the
// whole array as a single parameter), so the list is built as its own
// chunk of SQL the same way an IN-list has to be everywhere else in
// this codebase that isn't a plain inArray() query-builder call.
const driverQueueStatusList = sql.join(
  DRIVER_QUEUE_STATUSES.map((s) => sql`${s}`),
  sql.raw(", ")
);

/**
 * Used by the Team page's Drivers table (super_admin, with account
 * management) and, since 2026-09-18, the plain-staff Drivers lookup
 * page (/internal/dispatch/drivers) too — widened from requireSuperAdmin()
 * to requireStaff() because this shape (name/phone/isActive/createdAt/
 * email) has always been free of HR/compliance data; the Team page's
 * own page-level requireSuperAdmin() gate is unaffected by this change.
 *
 * todaysJobCount/lastActivityAt added 2026-09-24 (panel redesign round
 * 2, Drivers table) — both computed from orders.driverId/updatedAt,
 * nothing fabricated: a driver with zero orders shows 0/null, never a
 * guessed value.
 */
export async function listDrivers() {
  await requireStaff();
  const db = getDb();
  return db
    .select({
      id: drivers.id,
      name: drivers.name,
      phone: drivers.phone,
      isActive: drivers.isActive,
      createdAt: drivers.createdAt,
      email: sql<string | null>`(SELECT email FROM auth.users WHERE id = ${drivers.authUserId})`,
      todaysJobCount: sql<number>`(
        SELECT count(*) FROM ${orders}
        WHERE ${orders.driverId} = ${drivers.id}
        AND ${orders.status} IN (${driverQueueStatusList})
      )`,
      lastActivityAt: sql<string | null>`(
        SELECT max(${orders.updatedAt}) FROM ${orders} WHERE ${orders.driverId} = ${drivers.id}
      )`,
    })
    .from(drivers)
    .orderBy(drivers.createdAt);
}

/**
 * Used by /internal/dispatch/admin/drivers/[id] — everything listDrivers()
 * doesn't have: the driver's full assignment history (every order ever
 * assigned to them, any status — not just the active ones their own
 * /internal/driver page shows), honest performance stats, and hiring/
 * compliance fields. No ratings, no on-time %, no availability — nothing
 * in this schema collects any of that; only what's actually computable
 * from real columns (assignedAt/completedAt) is included.
 *
 * Widened from requireSuperAdmin() to requireStaff() 2026-09-18 — the
 * page itself now decides what a plain staff viewer sees (stats/history,
 * yes; hiring/compliance/documents, no) rather than the function
 * blocking staff entirely. The license/insurance fields below are still
 * only ever rendered for a super_admin viewer (see the page's own
 * isSuperAdmin check) — a Server Component never sends a field to the
 * browser unless it's actually interpolated into the returned JSX, so
 * fetching them here doesn't leak them to a staff viewer's browser.
 */
export async function getDriverDetail(driverId: string) {
  await requireStaff();
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
        licenseNumber: drivers.licenseNumber,
        licenseExpiresOn: drivers.licenseExpiresOn,
        vehicleMake: drivers.vehicleMake,
        vehicleModel: drivers.vehicleModel,
        vehicleYear: drivers.vehicleYear,
        vehiclePlate: drivers.vehiclePlate,
        insuranceCarrier: drivers.insuranceCarrier,
        insurancePolicyNumber: drivers.insurancePolicyNumber,
        insuranceExpiresOn: drivers.insuranceExpiresOn,
        licenseDocPath: drivers.licenseDocPath,
        insuranceDocPath: drivers.insuranceDocPath,
        registrationDocPath: drivers.registrationDocPath,
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

/**
 * Invites a new driver by email — no pre-existing City2Ranch account
 * required (2026-09-08). Two paths, both ending in the same `drivers`
 * row:
 *   - No account yet: supabase.auth.admin.inviteUserByEmail() creates
 *     one and sends Supabase's own invite email in the same call — the
 *     old "they need to sign in first, then try again" round trip this
 *     replaced was the actual source of hiring friction, not a safety
 *     feature worth keeping.
 *   - Account already exists (they signed in before, maybe as a plain
 *     customer): attach the driver row directly and send a plain
 *     "you've been added" notice instead, since there's no invite link
 *     to send someone who can already sign in.
 * Named `inviteDriver`, not `addDriver`, to make that distinction
 * visible at the call site — this is still bound to the same form/UI.
 */
export async function inviteDriver(
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
  const { email, name, phone } = parsed.data;
  const db = getDb();

  try {
    let authUserId = await findAuthUserIdByEmail(db, email);
    const isNewAccount = !authUserId;

    if (!authUserId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const { data, error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`,
      });
      if (error || !data.user) {
        console.error("[inviteDriver] inviteUserByEmail failed", error);
        return {
          ok: false,
          message: "We couldn't send that invite right now. Please try again shortly.",
          values: valuesFromFormData(formData, ["email", "name", "phone"]),
        };
      }
      authUserId = data.user.id;
    }

    const existing = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.authUserId, authUserId));
    if (existing[0]) {
      return {
        ok: false,
        message: "That person is already a driver.",
        values: valuesFromFormData(formData, ["email", "name", "phone"]),
      };
    }

    await db.insert(drivers).values({ authUserId, name, phone });

    // Only when they could already sign in — a brand-new invite's own
    // email (sent above) is already the notice; sending both would be
    // two emails for one event. Best-effort, like every other send in
    // this app — never blocks the driver actually being added.
    if (!isNewAccount) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const { subject, html } = driverAddedEmail({ driverName: name, signInUrl: `${siteUrl}/sign-in` });
        await getResend().emails.send({
          from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
          to: email,
          subject,
          html,
        });
      } catch (error) {
        console.error("[inviteDriver] driverAddedEmail send failed", error);
      }
    }
  } catch (error) {
    console.error("[inviteDriver] failed", error);
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
 * Saves the hiring/compliance fields (license, vehicle, insurance) on
 * an existing driver — bound as `updateDriverHiringInfo.bind(null,
 * driverId)`. Separate from document uploads (driver-documents.ts),
 * which need multipart FormData handling this plain text form doesn't.
 */
export async function updateDriverHiringInfo(
  driverId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = driverHiringInfoSchema.safeParse({
    licenseNumber: formData.get("licenseNumber"),
    licenseExpiresOn: formData.get("licenseExpiresOn"),
    vehicleMake: formData.get("vehicleMake"),
    vehicleModel: formData.get("vehicleModel"),
    vehicleYear: formData.get("vehicleYear"),
    vehiclePlate: formData.get("vehiclePlate"),
    insuranceCarrier: formData.get("insuranceCarrier"),
    insurancePolicyNumber: formData.get("insurancePolicyNumber"),
    insuranceExpiresOn: formData.get("insuranceExpiresOn"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const db = getDb();
  try {
    await db
      .update(drivers)
      .set({
        licenseNumber: parsed.data.licenseNumber ?? null,
        licenseExpiresOn: parsed.data.licenseExpiresOn ?? null,
        vehicleMake: parsed.data.vehicleMake ?? null,
        vehicleModel: parsed.data.vehicleModel ?? null,
        vehicleYear: parsed.data.vehicleYear ?? null,
        vehiclePlate: parsed.data.vehiclePlate ?? null,
        insuranceCarrier: parsed.data.insuranceCarrier ?? null,
        insurancePolicyNumber: parsed.data.insurancePolicyNumber ?? null,
        insuranceExpiresOn: parsed.data.insuranceExpiresOn ?? null,
      })
      .where(eq(drivers.id, driverId));
  } catch (error) {
    console.error("[updateDriverHiringInfo] failed", error);
    return { ok: false, message: "We couldn't save those details right now. Please try again shortly." };
  }

  revalidatePath(`/internal/dispatch/admin/drivers/${driverId}`);
  return { ok: true };
}

/**
 * Replaces the old separate setStaffRole()/setStaffActive() (2026-09-18,
 * panel redesign — the Team page's inline dropdown + two buttons per
 * row collapsed into one Edit page, see admin/team/[id]/edit/page.tsx)
 * — one form, one submit, Role and Status applied together in a single
 * transaction rather than as two separately-racing operations. No other
 * caller of the old two functions existed (confirmed), so they're
 * removed outright rather than kept alongside this.
 *
 * The last-super-admin safety rail now checks the *combined resulting
 * state* — demoting away from super_admin, disabling the account, or
 * both at once in the same submit are all covered by one condition
 * ("would this staff id still count as an active super_admin
 * afterward?") instead of two separate checks that could each pass on
 * their own while the combination still shouldn't. Same FOR UPDATE
 * transaction pattern as before for the same reason: two concurrent
 * edits to two different super admins must serialize, not both see
 * "someone else is still active" and both proceed to zero.
 */
export async function updateStaffAccount(
  staffId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const roleValue = formData.get("role");
  const role = roleValue === "super_admin" ? "super_admin" : roleValue === "manager" ? "manager" : "staff";
  const isActive = formData.get("isActive") === "true";
  const db = getDb();

  try {
    const beforeRows = await db
      .select({ role: staff.role, isActive: staff.isActive })
      .from(staff)
      .where(eq(staff.id, staffId));
    const before = beforeRows[0];
    if (!before) return { ok: false, message: "Staff member not found." };

    const blocked = await db.transaction(async (tx) => {
      const wouldStayActiveSuperAdmin = role === "super_admin" && isActive;
      if (!wouldStayActiveSuperAdmin) {
        const remaining = await activeSuperAdminCount(tx, staffId);
        if (remaining === 0) return true;
      }
      await tx.update(staff).set({ role, isActive }).where(eq(staff.id, staffId));
      return false;
    });
    if (blocked) {
      return {
        ok: false,
        message: "You can't remove or disable the last super admin. Promote or enable someone else first.",
      };
    }

    if (before.role !== role || before.isActive !== isActive) {
      await logAdminAuditEvent({
        actorStaffId: admin.id,
        action: "staff_account_updated",
        targetType: "staff_role",
        targetId: staffId,
        before: { role: before.role, isActive: before.isActive },
        after: { role, isActive },
      });
    }
  } catch (error) {
    console.error("[updateStaffAccount] failed", error);
    return { ok: false, message: "We couldn't update that account right now. Please try again shortly." };
  }

  revalidatePath(ADMIN_PATH);
  redirect(ADMIN_PATH);
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
