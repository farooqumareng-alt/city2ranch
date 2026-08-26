ALTER TABLE "orders" ADD COLUMN "service_label" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "service_label" text;