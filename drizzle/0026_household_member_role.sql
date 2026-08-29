CREATE TYPE "public"."household_role" AS ENUM('full', 'ordering', 'view_only');--> statement-breakpoint
ALTER TABLE "household_members" ADD COLUMN "role" "household_role" DEFAULT 'full' NOT NULL;