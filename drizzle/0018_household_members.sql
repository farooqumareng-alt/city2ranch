CREATE TYPE "public"."household_member_status" AS ENUM('invited', 'active', 'revoked');--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_auth_user_id" uuid NOT NULL,
	"member_email" text NOT NULL,
	"member_auth_user_id" uuid,
	"status" "household_member_status" DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "household_members_owner_auth_user_id_member_email_unique" UNIQUE("owner_auth_user_id","member_email")
);
--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_owner_auth_user_id_users_id_fk" FOREIGN KEY ("owner_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_member_auth_user_id_users_id_fk" FOREIGN KEY ("member_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;