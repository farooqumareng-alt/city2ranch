import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drivers, staff } from "@/lib/db/schema";
import { defaultLandingFor } from "@/lib/auth/roles";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Live deep test for defaultLandingFor() — written after two real bugs
 * were found in it against production data (2026-09-08, Priority 1/2 of
 * the master implementation directive): a deactivated driver row still
 * won priority over an active super_admin row, and /sign-in had its own
 * disagreeing copy of this decision. This exercises the actual function
 * against real, synthetic rows in a rolled-back transaction — not a
 * mock — for every combination that matters, so neither bug (or a
 * sibling of it) can silently return.
 *
 * Same zero-persistence discipline as lifecycle-integration.test.ts:
 * getDb().transaction() + unconditional rollback, with the transaction's
 * `tx` passed straight into defaultLandingFor()'s own injectable `db`
 * param — there is no separate staging database for this project.
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
  const email = `${label}-${randomUUID()}@roles-test.invalid`;
  const rows = (await tx.execute(
    sql`insert into auth.users (id, email) values (gen_random_uuid(), ${email}) returning id`
  )) as unknown as { id: string }[];
  return rows[0].id as string;
}

describe("defaultLandingFor — the one authoritative landing decision", () => {
  it("sends a plain identity (no staff/driver row) to /home", async () => {
    await withRollback(async (tx) => {
      const userId = await makeAuthUser(tx, "customer");
      expect(await defaultLandingFor(userId, tx)).toBe("/home");
    });
  });

  it("sends an active driver to /internal/driver", async () => {
    await withRollback(async (tx) => {
      const userId = await makeAuthUser(tx, "driver");
      await tx.insert(drivers).values({ authUserId: userId, name: "Test Driver", isActive: true });
      expect(await defaultLandingFor(userId, tx)).toBe("/internal/driver");
    });
  });

  it("sends staff (either role) to /internal/dispatch", async () => {
    await withRollback(async (tx) => {
      const staffId = await makeAuthUser(tx, "staff");
      await tx.insert(staff).values({ authUserId: staffId, role: "staff", label: "Test Staff" });
      expect(await defaultLandingFor(staffId, tx)).toBe("/internal/dispatch");
    });
    await withRollback(async (tx) => {
      const adminId = await makeAuthUser(tx, "super-admin");
      await tx.insert(staff).values({ authUserId: adminId, role: "super_admin", label: "Test Admin" });
      expect(await defaultLandingFor(adminId, tx)).toBe("/internal/dispatch");
    });
  });

  it("a deactivated driver falls through to staff — the exact Priority 1 bug, now covered", async () => {
    await withRollback(async (tx) => {
      const userId = await makeAuthUser(tx, "deactivated-driver-plus-admin");
      await tx.insert(drivers).values({ authUserId: userId, name: "Old Test Driver", isActive: false });
      await tx.insert(staff).values({ authUserId: userId, role: "super_admin", label: "Founder" });
      // Before the isActive filter, this returned "/internal/driver" —
      // the exact production symptom (city2ranch@gmail.com resolving to
      // DRIVER instead of Super Admin) this test exists to pin down.
      expect(await defaultLandingFor(userId, tx)).toBe("/internal/dispatch");
    });
  });

  it("a deactivated driver with no other role falls all the way through to /home", async () => {
    await withRollback(async (tx) => {
      const userId = await makeAuthUser(tx, "deactivated-driver-only");
      await tx.insert(drivers).values({ authUserId: userId, name: "Old Test Driver", isActive: false });
      expect(await defaultLandingFor(userId, tx)).toBe("/home");
    });
  });

  it("an active driver still wins priority over staff when both are genuinely active", async () => {
    await withRollback(async (tx) => {
      const userId = await makeAuthUser(tx, "active-driver-plus-staff");
      await tx.insert(drivers).values({ authUserId: userId, name: "Weekend Driver", isActive: true });
      await tx.insert(staff).values({ authUserId: userId, role: "staff", label: "Weekday Dispatcher" });
      // Deliberate: this priority order (driver beats staff when both
      // are active) is a real, disclosed product decision, not a bug —
      // see this function's own doc comment. This test only pins down
      // that it's still a *decision*, not an accident that regresses
      // silently alongside the isActive fix above.
      expect(await defaultLandingFor(userId, tx)).toBe("/internal/driver");
    });
  });
});
