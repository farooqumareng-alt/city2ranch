import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminAuditLog, staff } from "@/lib/db/schema";
import { logAdminAuditEvent, getAdminAuditLogFor } from "@/lib/admin-audit";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Live deep test for the shared admin-audit infrastructure
 * (2026-09-10) — the piece both Edit Customer and any future RBAC
 * change-logging depend on, so it gets its own coverage rather than
 * only being exercised indirectly through updateCustomerProfileAsAdmin
 * (which, like every mutating action in this codebase, can't be given
 * this same live-transaction treatment without new infrastructure —
 * see this session's own deep-test reports). Both logAdminAuditEvent()
 * and getAdminAuditLogFor() take an injectable `db`, so unlike the
 * requireSuperAdmin()-gated action itself, the logging plumbing is
 * fully testable here. Same zero-persistence discipline as
 * lifecycle-integration.test.ts: getDb().transaction() + unconditional
 * rollback.
 */
const db = getDb();
const ROLLBACK = Symbol("rollback-on-purpose");

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let thrown: unknown;
  let hasThrown = false;
  try {
    await db.transaction(async (tx) => {
      try {
        result = await fn(tx);
      } catch (e) {
        thrown = e;
        hasThrown = true;
      }
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  if (hasThrown) throw thrown;
  return result as T;
}

async function makeAuthUser(tx: Tx, label: string) {
  const email = `${label}-${randomUUID()}@admin-audit-test.invalid`;
  const rows = (await tx.execute(
    sql`insert into auth.users (id, email) values (gen_random_uuid(), ${email}) returning id`
  )) as unknown as { id: string }[];
  return { id: rows[0].id, email };
}

async function makeStaff(tx: Tx, label: string) {
  const user = await makeAuthUser(tx, label);
  const [row] = await tx
    .insert(staff)
    .values({ authUserId: user.id, role: "super_admin", label: "Test Admin" })
    .returning({ id: staff.id });
  return { id: row.id, email: user.email };
}

describe("admin audit log — the shared plumbing behind Edit Customer and future RBAC logging", () => {
  it("logs an event and reads it back with the acting staff member resolved", async () => {
    await withRollback(async (tx) => {
      const admin = await makeStaff(tx, "admin");
      const targetId = randomUUID();

      await logAdminAuditEvent(
        {
          actorStaffId: admin.id,
          action: "customer_profile_updated",
          targetType: "customer_profile",
          targetId,
          before: { name: "Old Name" },
          after: { name: "New Name" },
        },
        tx
      );

      const entries = await getAdminAuditLogFor("customer_profile", targetId, tx);
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe("customer_profile_updated");
      expect(entries[0].before).toEqual({ name: "Old Name" });
      expect(entries[0].after).toEqual({ name: "New Name" });
      expect(entries[0].actorLabel).toBe("Test Admin");
      expect(entries[0].actorEmail).toBe(admin.email);
    });
  });

  it("scopes strictly to the given targetType + targetId — a different target's entries never leak in", async () => {
    await withRollback(async (tx) => {
      const admin = await makeStaff(tx, "admin-scope");
      const targetA = randomUUID();
      const targetB = randomUUID();

      await logAdminAuditEvent(
        { actorStaffId: admin.id, action: "customer_profile_updated", targetType: "customer_profile", targetId: targetA },
        tx
      );
      await logAdminAuditEvent(
        { actorStaffId: admin.id, action: "customer_profile_updated", targetType: "customer_profile", targetId: targetB },
        tx
      );

      const entriesA = await getAdminAuditLogFor("customer_profile", targetA, tx);
      expect(entriesA.map((e) => e.after)).toHaveLength(1);

      // Also scoped by targetType, not just targetId — a hypothetical
      // future "staff_role" entry sharing the same id string must never
      // show up on a customer's Edit History.
      const entriesWrongType = await getAdminAuditLogFor("staff_role", targetA, tx);
      expect(entriesWrongType).toHaveLength(0);
    });
  });

  it("orders newest-first", async () => {
    await withRollback(async (tx) => {
      const admin = await makeStaff(tx, "admin-order");
      const targetId = randomUUID();

      // Inserted directly with explicit, clearly-different createdAt
      // values, bypassing logAdminAuditEvent()'s own DB-default
      // timestamp — two calls within the same transaction would both
      // resolve `now()` to the same transaction-start instant in
      // Postgres, making a real ordering assertion non-deterministic.
      // logAdminAuditEvent()'s own insert shape is already covered by
      // the tests above; this one is purely about getAdminAuditLogFor's
      // ORDER BY.
      await tx.insert(adminAuditLog).values({
        actorStaffId: admin.id,
        action: "first_edit",
        targetType: "customer_profile",
        targetId,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });
      await tx.insert(adminAuditLog).values({
        actorStaffId: admin.id,
        action: "second_edit",
        targetType: "customer_profile",
        targetId,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      });

      const entries = await getAdminAuditLogFor("customer_profile", targetId, tx);
      expect(entries.map((e) => e.action)).toEqual(["second_edit", "first_edit"]);
    });
  });
});
