CREATE TYPE "public"."membership_status" AS ENUM('active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('route', 'private', 'estate');--> statement-breakpoint
CREATE TABLE "membership_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sales_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"tier" "membership_tier" NOT NULL,
	"status" "membership_status" NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"current_period_end" timestamp with time zone,
	CONSTRAINT "memberships_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "memberships_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Seed the one settings row this table will ever have (see the doc
-- comment on membershipSettings in src/lib/db/schema.ts) so the app
-- never has to handle "no row exists yet" — membership sales start
-- OFF per the business's launch strategy, and stay off until staff
-- flips this from /internal/dispatch/settings.
INSERT INTO "membership_settings" ("sales_enabled") VALUES (false);