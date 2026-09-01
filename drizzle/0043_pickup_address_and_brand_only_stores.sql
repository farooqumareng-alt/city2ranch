ALTER TABLE "stores" ALTER COLUMN "address_line1" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "state" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "zip" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_address_line1" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_address_line2" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_city" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_state" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_zip" text;