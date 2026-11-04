ALTER TABLE "order_delivery_pins" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_delivery_pins" ADD COLUMN "locked_at" timestamp with time zone;