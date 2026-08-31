import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, stores, drivers, zipMileage, serviceRequests } from "@/lib/db/schema";
import { getMyServices } from "@/lib/my-services";
import { getWorkQueue, type WorkQueueItem } from "@/lib/work-queue";

// vitest doesn't load .env.local on its own — same fix rls-security.test.ts
// already applies.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Live integration tests for what actually changed across Phase 2 (My
 * Services), Phase 3 (Work Queue / Service Record), and the driver
 * Accept/Decline reconciliation — not re-testing canTransition's pairwise
 * legality (status.test.ts already does that), but proving the two
 * consumer-facing views that read those transitions (getMyServices,
 * getWorkQueue) actually bucket a real order correctly at every stage of
 * its real life, for both service types.
 *
 * Same zero-persistence discipline as rls-security.test.ts, and for the
 * same reason — there is no separate staging database for this project.
 * Every scenario runs inside `withRollback`, using getDb().transaction()
 * (not the raw `postgres` package rls-security.test.ts uses) specifically
 * so the transaction's `tx` can be passed straight into getMyServices()/
 * getWorkQueue() themselves — both now take an optional injectable `db`
 * param for exactly this (see my-services.ts/work-queue.ts's AnyDb).
 * Without that, this suite would need to commit real rows to production
 * to make them visible to those functions' own separate connection, since
 * one open transaction's uncommitted writes are invisible to a query on
 * a different connection — not a risk worth taking here.
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

/** Same shape as rls-security.test.ts's makeAuthUser, via drizzle's raw
 *  sql`` instead of the separate `postgres` package — auth.users isn't
 *  an exported Drizzle table (see schema.ts's own comment on why), so a
 *  real insert needs raw SQL either way. */
async function makeAuthUser(tx: Tx, label: string) {
  const email = `${label}-${randomUUID()}@lifecycle-test.invalid`;
  const rows = (await tx.execute(
    sql`insert into auth.users (id, email) values (gen_random_uuid(), ${email}) returning id`
  )) as unknown as { id: string }[];
  return { id: rows[0].id, email };
}

async function seedZip(tx: Tx): Promise<string> {
  const zip = randomUUID().replace(/-/g, "").slice(0, 5);
  await tx.insert(zipMileage).values({ zip, roundTripMiles: "12.0" });
  return zip;
}

async function seedStore(tx: Tx, zip: string): Promise<string> {
  const [row] = await tx
    .insert(stores)
    .values({ name: "Lifecycle Test Store", addressLine1: "1 Main St", city: "Testville", state: "TX", zip })
    .returning({ id: stores.id });
  return row.id;
}

async function seedDriver(tx: Tx): Promise<{ id: string; authUserId: string }> {
  const user = await makeAuthUser(tx, "driver");
  const [row] = await tx
    .insert(drivers)
    .values({ authUserId: user.id, name: "Test Driver", isActive: true })
    .returning({ id: drivers.id });
  return { id: row.id, authUserId: user.id };
}

function findItem(items: WorkQueueItem[], id: string) {
  return items.find((i) => i.id === id);
}

describe("City Pickup order — My Services / Work Queue bucketing across the real lifecycle", () => {
  // Default 5s timeout isn't enough for 8 sequential real-status stages
  // × 2 read functions each, over a pooled cross-region connection —
  // not a slow query, just a lot of them, deliberately run in sequence
  // (not Promise.all) since each stage depends on the previous write.
  it("moves through every real status with the correct bucket on both sides", async () => {
    await withRollback(async (tx) => {
      const customer = await makeAuthUser(tx, "customer");
      const zip = await seedZip(tx);
      const storeId = await seedStore(tx, zip);
      const driver = await seedDriver(tx);

      const [order] = await tx
        .insert(orders)
        .values({
          serviceType: "pickup",
          authUserId: customer.id,
          customerName: "Test Customer",
          customerEmail: customer.email,
          customerPhone: "555-0100",
          storeId,
          retailerOrderNumber: "R-1",
          deliveryAddressLine1: "9 Ranch Rd",
          deliveryCity: "Testville",
          deliveryState: "TX",
          deliveryZip: zip,
          status: "priced",
          serviceLabel: "Rural Route Service",
          totalCents: 5000,
        })
        .returning({ id: orders.id });

      async function assertBuckets(myServicesBucket: string, workQueueBucket: string) {
        const mine = await getMyServices(customer.id, customer.email, tx);
        const mineItem = mine.find((i) => i.id === order.id);
        expect(mineItem, "order should appear in getMyServices").toBeTruthy();
        expect(mineItem!.bucket).toBe(myServicesBucket);

        const queue = await getWorkQueue(tx);
        const queueItem = findItem(queue, order.id);
        expect(queueItem, "order should appear in getWorkQueue").toBeTruthy();
        expect(queueItem!.bucket).toBe(workQueueBucket);
      }

      // priced -> customer must approve & pay; staff sees it as awaiting the customer.
      await assertBuckets("needs_action", "awaiting_customer");

      await tx.update(orders).set({ status: "payment_pending" }).where(eq(orders.id, order.id));
      await assertBuckets("active", "needs_payment");

      await tx.update(orders).set({ status: "paid", paidAt: new Date() }).where(eq(orders.id, order.id));
      await assertBuckets("active", "ready_to_dispatch");

      // Staff offers the job to a driver — pending_acceptance, not
      // driver_assigned directly (see src/lib/orders/status.ts).
      await tx
        .update(orders)
        .set({ status: "pending_acceptance", driverId: driver.id, assignedAt: new Date() })
        .where(eq(orders.id, order.id));
      await assertBuckets("active", "awaiting_driver_response");

      await tx.update(orders).set({ status: "driver_assigned" }).where(eq(orders.id, order.id));
      await assertBuckets("active", "in_progress");

      await tx.update(orders).set({ status: "picked_up" }).where(eq(orders.id, order.id));
      await assertBuckets("active", "in_progress");

      await tx.update(orders).set({ status: "in_transit" }).where(eq(orders.id, order.id));
      await assertBuckets("active", "in_progress");

      await tx.update(orders).set({ status: "completed", completedAt: new Date() }).where(eq(orders.id, order.id));
      await assertBuckets("completed", "completed");
    });
  }, 30_000);

  it("a declined driver offer returns to Ready to Dispatch, not a dead end", async () => {
    await withRollback(async (tx) => {
      const customer = await makeAuthUser(tx, "customer");
      const zip = await seedZip(tx);
      const storeId = await seedStore(tx, zip);
      const driver = await seedDriver(tx);

      const [order] = await tx
        .insert(orders)
        .values({
          serviceType: "pickup",
          authUserId: customer.id,
          customerName: "Test Customer",
          customerEmail: customer.email,
          customerPhone: "555-0100",
          storeId,
          deliveryAddressLine1: "9 Ranch Rd",
          deliveryCity: "Testville",
          deliveryState: "TX",
          deliveryZip: zip,
          status: "paid",
          paidAt: new Date(),
          serviceLabel: "Rural Route Service",
          totalCents: 5000,
        })
        .returning({ id: orders.id });

      await tx
        .update(orders)
        .set({ status: "pending_acceptance", driverId: driver.id, assignedAt: new Date() })
        .where(eq(orders.id, order.id));
      let queue = await getWorkQueue(tx);
      expect(findItem(queue, order.id)!.bucket).toBe("awaiting_driver_response");

      // declineJob's own real behavior (src/lib/actions/driver-accept-decline.ts):
      // reverts to "paid" and clears driverId/assignedAt — no separate
      // "declined" state to track.
      await tx
        .update(orders)
        .set({ status: "paid", driverId: null, assignedAt: null })
        .where(eq(orders.id, order.id));
      queue = await getWorkQueue(tx);
      const reverted = findItem(queue, order.id)!;
      expect(reverted.bucket).toBe("ready_to_dispatch");
      expect(reverted.driverName).toBeNull();
    });
  });
});

describe("Concierge request → order — My Services / Work Queue across conversion", () => {
  it("a pre-conversion request appears on both, then is replaced (not duplicated) once converted", async () => {
    await withRollback(async (tx) => {
      const customer = await makeAuthUser(tx, "customer");
      // service_requests.zip has no FK (it's guest intake, pre-route-check
      // by design), but orders.deliveryZip does — real zip_mileage row
      // needed for the order insert below.
      const zip = await seedZip(tx);

      const [request] = await tx
        .insert(serviceRequests)
        .values({
          name: "Test Customer",
          email: customer.email,
          phone: "555-0100",
          addressLine1: "9 Ranch Rd",
          city: "Testville",
          state: "TX",
          zip,
          // service_requests.serviceType is the marketing intake enum
          // (groceries/private_shopping/etc.), a different type from
          // orders.serviceType's pickup/concierge — see schema.ts's own
          // comment on why they're two separate enums.
          serviceType: "groceries",
          timingPreference: "This week",
          status: "new",
        })
        .returning({ id: serviceRequests.id });

      // Pre-conversion: shows as a "request"-kind item on both sides.
      let mine = await getMyServices(customer.id, customer.email, tx);
      let mineItem = mine.find((i) => i.id === request.id);
      expect(mineItem, "unconverted request should appear in getMyServices").toBeTruthy();
      expect(mineItem!.kind).toBe("request");
      expect(mineItem!.bucket).toBe("active");
      expect(mineItem!.href).toBe(`/my-services/request/${request.id}`);

      let queue = await getWorkQueue(tx);
      let queueItem = findItem(queue, request.id);
      expect(queueItem, "unconverted request should appear in getWorkQueue").toBeTruthy();
      expect(queueItem!.kind).toBe("request");
      expect(queueItem!.bucket).toBe("needs_quote");

      // Staff converts it (mirrors create-concierge-order.ts): a new
      // order referencing the request, and the request flips to
      // "converted" — deliberately left unclaimed (authUserId null) to
      // also exercise that branch, same as a guest submission would be.
      const [order] = await tx
        .insert(orders)
        .values({
          serviceType: "concierge",
          serviceRequestId: request.id,
          customerName: "Test Customer",
          customerEmail: customer.email,
          customerPhone: "555-0100",
          deliveryAddressLine1: "9 Ranch Rd",
          deliveryCity: "Testville",
          deliveryState: "TX",
          deliveryZip: zip,
          status: "quote_pending",
          serviceLabel: "City2Ranch Concierge Shopping & Delivery",
          totalCents: 0,
        })
        .returning({ id: orders.id });
      await tx.update(serviceRequests).set({ status: "converted" }).where(eq(serviceRequests.id, request.id));

      // Post-conversion: the request-kind card is gone, replaced by the
      // order — never both at once.
      mine = await getMyServices(customer.id, customer.email, tx);
      expect(mine.find((i) => i.id === request.id && i.kind === "request")).toBeUndefined();
      mineItem = mine.find((i) => i.id === order.id);
      expect(mineItem, "converted order should appear in getMyServices").toBeTruthy();
      expect(mineItem!.bucket).toBe("active"); // quote_pending: nothing to act on yet
      expect(mineItem!.needsClaim).toBe(true); // unclaimed — authUserId is null

      queue = await getWorkQueue(tx);
      expect(findItem(queue, request.id)).toBeUndefined();
      queueItem = findItem(queue, order.id);
      expect(queueItem, "converted order should appear in getWorkQueue").toBeTruthy();
      expect(queueItem!.kind).toBe("order");
      expect(queueItem!.bucket).toBe("needs_quote");

      // Staff finalizes the quote (mirrors finalize-concierge-quote.ts).
      await tx.update(orders).set({ status: "priced", totalCents: 7500 }).where(eq(orders.id, order.id));
      mine = await getMyServices(customer.id, customer.email, tx);
      expect(mine.find((i) => i.id === order.id)!.bucket).toBe("needs_action");
      queue = await getWorkQueue(tx);
      expect(findItem(queue, order.id)!.bucket).toBe("awaiting_customer");
    });
  });
});

afterAll(async () => {
  await db.$client.end();
});
