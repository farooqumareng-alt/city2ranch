CREATE TYPE "public"."pricing_outcome" AS ENUM('STANDARD_PRICE', 'STAFF_REVIEW', 'NOT_ECONOMICALLY_VIABLE');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "hard_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sustainable_floor_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "target_profit_price_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pricing_outcome" "pricing_outcome";--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "service_type" "order_service_type" DEFAULT 'pickup' NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "contractor_flat_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "contractor_per_mile_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "sustainable_cost_allowance_cents" integer;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "target_margin_percent" numeric(5, 2);