-- Follow-up to the 2026-08-30 incident bridge (0040): main is now
-- deployed with the code that reads/writes order_delivery_pins instead
-- (confirmed via `git grep deliveryPin main` — no remaining reference
-- to the orders.delivery_pin column anywhere in the deployed code).
-- order_delivery_pins becomes the sole source of truth again, matching
-- what 0037 originally intended before the deploy gap forced a
-- temporary reversion.
ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivery_pin";
