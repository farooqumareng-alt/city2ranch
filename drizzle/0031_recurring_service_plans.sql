CREATE TYPE "public"."recurring_plan_frequency" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."recurring_plan_status" AS ENUM('active', 'paused', 'canceled');--> statement-breakpoint
CREATE TABLE "recurring_service_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_service_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"delivery_address_line1" text NOT NULL,
	"delivery_address_line2" text,
	"delivery_city" text NOT NULL,
	"delivery_state" text NOT NULL,
	"delivery_zip" text NOT NULL,
	"customer_notes" text,
	"frequency" "recurring_plan_frequency" NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"status" "recurring_plan_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "recurring_order_created" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_service_plan_items" ADD CONSTRAINT "recurring_service_plan_items_plan_id_recurring_service_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."recurring_service_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_service_plans" ADD CONSTRAINT "recurring_service_plans_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_service_plans" ADD CONSTRAINT "recurring_service_plans_delivery_zip_zip_mileage_zip_fk" FOREIGN KEY ("delivery_zip") REFERENCES "public"."zip_mileage"("zip") ON DELETE no action ON UPDATE no action;