-- EMERGENCY COMPATIBILITY FIX (2026-08-30): migration 0037 dropped
-- orders.delivery_pin and moved it to a new order_delivery_pins table —
-- correct for the security-remediation branch's code, but that code was
-- never merged/deployed to main. main's currently-deployed code still
-- declares delivery_pin on the orders schema, so any bare
-- `.select().from(orders)` (Drizzle expands this to an explicit column
-- list) started throwing "column orders.delivery_pin does not exist" —
-- breaking Approve & Pay, the Stripe webhook, assign-driver, every
-- driver action, cancel/fail order, and finalize-concierge-quote in
-- production.
--
-- This restores the column and backfills it from order_delivery_pins so
-- main's already-running code works again exactly as it did before,
-- with zero code deploy. It is a deliberate, temporary reversion to
-- main's pre-remediation behavior (RLS on this column is back to
-- whatever main's own migrations already had — the same posture the
-- app has run under until today, not a new or worse exposure). Once
-- security-remediation/operations-data-screens are actually merged and
-- deployed, this column should be dropped again in a follow-up
-- migration and order_delivery_pins becomes the sole source of truth.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_pin" text;
--> statement-breakpoint

UPDATE "orders" SET "delivery_pin" = "odp"."pin"
FROM "order_delivery_pins" "odp"
WHERE "orders"."id" = "odp"."order_id" AND "orders"."delivery_pin" IS NULL;
