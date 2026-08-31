import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

// vitest doesn't load .env.local on its own the way `next dev`/`next
// build` do — same one-line fix drizzle.config.ts already uses.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Live regression tests for the RLS policies fixed in the 2026-08-30
 * security remediation pass — proving the *database* behaves correctly
 * for a real `authenticated`-role request, not just re-reading the
 * TypeScript code that happens to call the right helper today. This is
 * the one place in this repo's test suite that talks to Postgres
 * directly instead of through Drizzle: `SET LOCAL ROLE` and
 * `request.jwt.claims` (what auth.uid()/auth.jwt() actually read — see
 * `select prosrc from pg_proc where proname in ('uid','jwt')`, checked
 * against this project's own Supabase instance before writing this
 * file) have no equivalent in the app's normal query layer, which
 * always runs as the privileged, RLS-bypassing DATABASE_URL role.
 *
 * Every scenario runs inside `withRollback`, which unconditionally
 * rolls back afterward — success, failure, or a thrown assertion. That
 * includes the disposable `auth.users`/`staff`/`drivers`/
 * `household_members` fixture rows each test creates: nothing here
 * persists, so this suite is safe to run repeatedly against
 * production's own DATABASE_URL (which is what it does — there is no
 * separate staging database for this project).
 *
 * What this suite does NOT attempt: obtaining a real Supabase-issued
 * JWT (would require completing a real magic-link email flow) or
 * calling PostgREST over HTTP. Simulating the JWT claims Postgres-side
 * is the same mechanism PostgREST itself uses to set them, so this
 * exercises the identical policy evaluation a real request would.
 */

let sql: postgres.Sql;

beforeAll(() => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the RLS security suite");
  }
  sql = postgres(connectionString, { max: 1 });
});

afterAll(async () => {
  await sql.end();
});

const ROLLBACK = Symbol("rollback-on-purpose");

/** Runs `fn` inside a transaction that is always rolled back afterward,
 *  regardless of what fn returns or throws. An assertion failure inside
 *  fn still fails the test — it's re-thrown after the rollback. */
async function withRollback<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let thrown: unknown;
  let hasThrown = false;
  try {
    await sql.begin(async (tx) => {
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

/** Switches the rest of the transaction to the `authenticated` role
 *  with the given user id (and, optionally, email — several policies
 *  match a not-yet-accepted invite by email, since member_auth_user_id
 *  is null until then) as auth.uid()/auth.jwt() — exactly what
 *  PostgREST arranges for a real request carrying that user's JWT. */
async function actAs(tx: postgres.TransactionSql, userId: string, email?: string) {
  await tx`SET LOCAL ROLE authenticated`;
  await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, email, role: "authenticated" })}, true)`;
}

async function makeAuthUser(tx: postgres.TransactionSql, label: string) {
  const email = `${label}-${crypto.randomUUID()}@rls-security-test.invalid`;
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), ${email}) RETURNING id
  `;
  return { id: row.id, email };
}

describe("household_members — P0: member self-escalation (member_update_own WITH CHECK)", () => {
  async function seed(
    tx: postgres.TransactionSql,
    role: "full" | "ordering" | "view_only",
    status: "invited" | "active" | "revoked"
  ) {
    const owner = await makeAuthUser(tx, "owner");
    const member = await makeAuthUser(tx, "member");
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO household_members (owner_auth_user_id, member_email, member_auth_user_id, status, role, accepted_at)
      VALUES (
        ${owner.id}, ${member.email},
        ${status === "invited" ? null : member.id},
        ${status}, ${role},
        ${status === "active" ? new Date() : null}
      )
      RETURNING id
    `;
    return { owner, member, rowId: row.id };
  }

  // Note on shape: these five rows all match member_update_own's USING
  // clause (the member owns the row), so the UPDATE is attempted and
  // WITH CHECK is what rejects it — Postgres raises a hard "new row
  // violates row-level security policy" error in that case, it doesn't
  // silently return zero rows (that shape is what happens when USING
  // itself excludes the row, e.g. someone else's row entirely).

  it("view_only cannot self-escalate to full", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "view_only", "active");
      await actAs(tx, member.id);
      await expect(
        tx`UPDATE household_members SET role = 'full' WHERE id = ${rowId} RETURNING id`
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("view_only cannot self-escalate to ordering", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "view_only", "active");
      await actAs(tx, member.id);
      await expect(
        tx`UPDATE household_members SET role = 'ordering' WHERE id = ${rowId} RETURNING id`
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("ordering cannot self-escalate to full", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "ordering", "active");
      await actAs(tx, member.id);
      await expect(
        tx`UPDATE household_members SET role = 'full' WHERE id = ${rowId} RETURNING id`
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("a revoked member cannot restore their own status to active", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "full", "revoked");
      await actAs(tx, member.id);
      await expect(
        tx`UPDATE household_members SET status = 'active' WHERE id = ${rowId} RETURNING id`
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("a member cannot re-parent their own row to a different owner", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "full", "active");
      const otherOwner = await makeAuthUser(tx, "other-owner");
      await actAs(tx, member.id);
      await expect(
        tx`UPDATE household_members SET owner_auth_user_id = ${otherOwner.id} WHERE id = ${rowId} RETURNING id`
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("a member cannot attach themselves to an arbitrary household via INSERT", async () => {
    await withRollback(async (tx) => {
      const victim = await makeAuthUser(tx, "victim-owner");
      const attacker = await makeAuthUser(tx, "attacker");
      await actAs(tx, attacker.id);
      await expect(
        tx`
          INSERT INTO household_members (owner_auth_user_id, member_email, member_auth_user_id, status, role, accepted_at)
          VALUES (${victim.id}, ${attacker.email}, ${attacker.id}, 'active', 'full', now())
        `
      ).rejects.toThrow();
    });
  });

  // Two "must succeed" cases — proving the WITH CHECK fix didn't
  // overcorrect and break the legitimate flows it has to keep allowing.
  it("still allows accepting a pending invite (invited -> active)", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "full", "invited");
      // An invited row has no member_auth_user_id yet — USING can only
      // match it via the email branch, exactly like a real acceptor's
      // JWT would carry their own email claim.
      await actAs(tx, member.id, member.email);
      const updated = await tx`
        UPDATE household_members SET status = 'active', member_auth_user_id = ${member.id}, accepted_at = now()
        WHERE id = ${rowId} RETURNING id
      `;
      expect(updated.length).toBe(1);
    });
  });

  it("still allows leaving an active membership (active -> revoked)", async () => {
    await withRollback(async (tx) => {
      const { member, rowId } = await seed(tx, "full", "active");
      await actAs(tx, member.id);
      const updated = await tx`UPDATE household_members SET status = 'revoked' WHERE id = ${rowId} RETURNING id`;
      expect(updated.length).toBe(1);
    });
  });
});

describe("household_members — P2: at most one active membership per member", () => {
  it("a second INSERT for the same member with status active violates the unique index", async () => {
    await withRollback(async (tx) => {
      const ownerA = await makeAuthUser(tx, "owner-a");
      const ownerB = await makeAuthUser(tx, "owner-b");
      const member = await makeAuthUser(tx, "member");
      await tx`
        INSERT INTO household_members (owner_auth_user_id, member_email, member_auth_user_id, status, role, accepted_at)
        VALUES (${ownerA.id}, ${member.email}, ${member.id}, 'active', 'full', now())
      `;
      await expect(
        tx`
          INSERT INTO household_members (owner_auth_user_id, member_email, member_auth_user_id, status, role, accepted_at)
          VALUES (${ownerB.id}, ${member.email}, ${member.id}, 'active', 'full', now())
        `
      ).rejects.toThrow(/household_members_one_active_per_member/);
    });
  });
});

describe("staff — P1: self_select requires is_active, and staff_all inherits the fix transitively", () => {
  async function makeStaff(tx: postgres.TransactionSql, isActive: boolean) {
    const user = await makeAuthUser(tx, "staff");
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO staff (auth_user_id, role, is_active) VALUES (${user.id}, 'staff', ${isActive}) RETURNING id
    `;
    return { user, staffId: row.id };
  }

  it("a disabled staff account cannot see its own staff row", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeStaff(tx, false);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM staff WHERE auth_user_id = ${user.id}`;
      expect(rows.length).toBe(0);
    });
  });

  it("an active staff account can see its own staff row", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeStaff(tx, true);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM staff WHERE auth_user_id = ${user.id}`;
      expect(rows.length).toBe(1);
    });
  });

  // End-to-end propagation proof: staff_all on a real, unrelated table
  // (pricing_rules — known to have exactly one real row in production,
  // per src/lib/pricing/repository.ts's own invariant) never mentions
  // is_active itself; it inherits the fix purely through staff's own
  // self_select being referenced inside staff_all's EXISTS subquery.
  it("a disabled staff account loses staff_all access on pricing_rules (transitively, no direct fix on that policy)", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeStaff(tx, false);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM pricing_rules`;
      expect(rows.length).toBe(0);
    });
  });

  it("an active staff account keeps staff_all access on pricing_rules", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeStaff(tx, true);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM pricing_rules`;
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});

describe("drivers — P1: self_select requires is_active (closes the disabled-driver half of the PIN finding)", () => {
  async function makeDriver(tx: postgres.TransactionSql, isActive: boolean) {
    const user = await makeAuthUser(tx, "driver");
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO drivers (auth_user_id, name, is_active) VALUES (${user.id}, 'Test Driver', ${isActive}) RETURNING id
    `;
    return { user, driverId: row.id };
  }

  it("a disabled driver cannot see its own driver row", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeDriver(tx, false);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM drivers WHERE auth_user_id = ${user.id}`;
      expect(rows.length).toBe(0);
    });
  });

  it("an active driver can see its own driver row", async () => {
    await withRollback(async (tx) => {
      const { user } = await makeDriver(tx, true);
      await actAs(tx, user.id);
      const rows = await tx`SELECT id FROM drivers WHERE auth_user_id = ${user.id}`;
      expect(rows.length).toBe(1);
    });
  });
});

describe("order_delivery_pins — P1: default-deny for everyone via the Data API", () => {
  // No policies at all exist on this table (see the doc comment on
  // orderDeliveryPins in schema.ts) — this is what actually replaced
  // the ineffective column-level REVOKE on orders.delivery_pin
  // (verified during remediation to have no effect, since authenticated
  // already holds table-level SELECT on "orders" by default and Postgres
  // column privileges can't subtract from a broader table-level grant).
  // Deliberately tests against a completely arbitrary authenticated
  // identity, not a driver specifically — the point of this table is
  // that NOBODY reaches it through the Data API, regardless of role.
  it("an arbitrary authenticated user cannot read any row", async () => {
    await withRollback(async (tx) => {
      const someone = await makeAuthUser(tx, "arbitrary");
      await actAs(tx, someone.id);
      const rows = await tx`SELECT * FROM order_delivery_pins`;
      expect(rows.length).toBe(0);
    });
  });

  it("an arbitrary authenticated user cannot insert a row", async () => {
    // Fetched before entering the transaction below, deliberately — the
    // pool is max:1, so a second query nested inside an open
    // sql.begin() transaction on the same connection would deadlock
    // waiting for a connection that transaction itself is holding.
    const [order] = await sql<{ id: string }[]>`SELECT id FROM orders LIMIT 1`;
    if (!order) {
      // Nothing to attach a disposable PIN row to (e.g. a genuinely
      // empty database) — the SELECT-side test above already proves
      // the table is unreadable regardless, so skip rather than fail.
      return;
    }
    await withRollback(async (tx) => {
      const someone = await makeAuthUser(tx, "arbitrary");
      await actAs(tx, someone.id);
      await expect(
        tx`INSERT INTO order_delivery_pins (order_id, pin) VALUES (${order.id}, '0000')`
      ).rejects.toThrow(/row-level security/);
    });
  });
});
