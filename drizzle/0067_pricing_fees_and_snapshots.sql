ALTER TABLE "orders" ADD COLUMN "stripe_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "net_revenue_cents" integer;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "stripe_fee_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "stripe_fee_fixed_cents" integer;