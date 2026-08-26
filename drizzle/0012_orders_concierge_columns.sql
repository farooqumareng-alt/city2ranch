CREATE TABLE "order_fee_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"notes" text,
	"status" "order_item_status" DEFAULT 'requested' NOT NULL,
	"substitution_note" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "auth_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "retailer_order_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "pricing_rule_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "round_trip_miles" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "base_fee_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "mileage_fee_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_type" "order_service_type" DEFAULT 'pickup' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_request_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "market" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "market" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "zip_mileage" ADD COLUMN "market" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_fee_lines" ADD CONSTRAINT "order_fee_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;