CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"name" text,
	"phone" text,
	"default_delivery_address_line1" text,
	"default_delivery_address_line2" text,
	"default_delivery_city" text,
	"default_delivery_state" text,
	"default_delivery_zip" text,
	CONSTRAINT "customer_profiles_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;