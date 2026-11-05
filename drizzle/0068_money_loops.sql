CREATE TABLE "order_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"stripe_refund_id" text,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"actor_staff_id" uuid,
	"error" text,
	CONSTRAINT "order_refunds_stripe_refund_id_unique" UNIQUE("stripe_refund_id")
);
--> statement-breakpoint
ALTER TABLE "order_fee_lines" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_actor_staff_id_staff_id_fk" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Staff-only table (same pattern as migration 0065's pricing tables):
-- refunds are staff-issued financial records; the app reads them over
-- its privileged connection, and no customer-facing Data API access
-- is granted. RLS enabled with a single staff policy.
ALTER TABLE "order_refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "staff_all" ON "order_refunds" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
