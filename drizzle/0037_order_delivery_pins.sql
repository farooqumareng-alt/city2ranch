CREATE TABLE "order_delivery_pins" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"pin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_delivery_pins" ADD CONSTRAINT "order_delivery_pins_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- RLS enabled with *zero* policies for "authenticated" — a real
-- default-deny for the Data API, unlike a column-level REVOKE (which
-- this migration replaces: see 0035's delivery_pin REVOKE, which was
-- verified after the fact to have no effect, since authenticated
-- already holds table-level SELECT on "orders" and Postgres column
-- privileges cannot subtract from a broader table-level grant). Only
-- the app's own privileged DATABASE_URL connection, which bypasses RLS
-- entirely, ever reads or writes this table.
ALTER TABLE "order_delivery_pins" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Carry forward any PIN already generated for an order still in
-- flight (payment taken, not yet delivered) before the column is
-- dropped below. Safe to run unconditionally — WHERE excludes orders
-- that never had one.
INSERT INTO "order_delivery_pins" ("order_id", "pin")
SELECT "id", "delivery_pin" FROM "orders" WHERE "delivery_pin" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "orders" DROP COLUMN "delivery_pin";