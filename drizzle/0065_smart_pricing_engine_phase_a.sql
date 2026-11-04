CREATE TABLE "order_actuals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"actual_drive_minutes" integer,
	"actual_shop_minutes" integer,
	"actual_wait_minutes" integer,
	"actual_miles" numeric(6, 1),
	"compensation_type" text,
	"labor_paid_cents" integer,
	"vehicle_cost_cents" integer,
	"refund_cents" integer DEFAULT 0 NOT NULL,
	"outcome" text,
	CONSTRAINT "order_actuals_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"target_margin_percent" numeric(5, 2),
	"min_contribution_cents" integer,
	"min_fee_cents" integer,
	"auto_approval_ceiling_cents" integer,
	"quote_expiry_minutes" integer DEFAULT 4320 NOT NULL,
	"round_up_to_cents" integer,
	"urgency_priority_percent" numeric(5, 2),
	"urgency_rush_percent" numeric(5, 2),
	"scarcity_tight_percent" numeric(5, 2),
	"scarcity_scarce_percent" numeric(5, 2),
	"complexity_complex_percent" numeric(5, 2),
	"schedule_off_hours_percent" numeric(5, 2),
	"route_density_credit_percent" numeric(5, 2),
	"note" text,
	CONSTRAINT "pricing_policies_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "pricing_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid,
	"mode" text DEFAULT 'shadow' NOT NULL,
	"status" text NOT NULL,
	"engine_version" text NOT NULL,
	"policy_version" text NOT NULL,
	"rate_card_version" text NOT NULL,
	"band" text NOT NULL,
	"request_snapshot" jsonb NOT NULL,
	"components" jsonb,
	"direct_cost_cents" integer,
	"break_even_cents" integer,
	"target_cents" integer,
	"floor_cents" integer,
	"final_cents" integer,
	"predicted_contribution_cents" integer,
	"confidence" text NOT NULL,
	"explanation" jsonb,
	"expires_at" timestamp with time zone,
	"superseded_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pricing_rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"contractor_flat_local_cents" integer,
	"contractor_flat_near_cents" integer,
	"contractor_flat_extended_cents" integer,
	"contractor_flat_remote_cents" integer,
	"contractor_flat_estate_rural_cents" integer,
	"staff_hourly_rate_cents" integer,
	"vehicle_per_mile_cents" integer,
	"support_allowance_cents" integer,
	"consumables_cents" integer,
	"failure_allowance_cents" integer,
	"stripe_percent" numeric(5, 3) DEFAULT '2.900' NOT NULL,
	"stripe_fixed_cents" integer DEFAULT 30 NOT NULL,
	"note" text,
	CONSTRAINT "pricing_rate_cards_version_unique" UNIQUE("version")
);
--> statement-breakpoint
ALTER TABLE "order_actuals" ADD CONSTRAINT "order_actuals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_quotes" ADD CONSTRAINT "pricing_quotes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- RLS, same shape as 0064_rls_driver_applications.sql: staff gets full
-- access; the app's own writes go through a privileged direct Postgres
-- connection and don't need a policy of their own. These tables hold
-- business pricing configuration and quote records — no customer or
-- driver role should ever read them directly.
ALTER TABLE "pricing_policies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff_all" ON "pricing_policies" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
ALTER TABLE "pricing_rate_cards" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff_all" ON "pricing_rate_cards" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
ALTER TABLE "pricing_quotes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff_all" ON "pricing_quotes" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
ALTER TABLE "order_actuals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff_all" ON "order_actuals" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
