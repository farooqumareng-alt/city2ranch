ALTER TABLE "pricing_rules" ADD COLUMN "zone_key" text;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "zone_label" text;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "zone_min_miles" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "zone_max_miles" numeric(6, 1);