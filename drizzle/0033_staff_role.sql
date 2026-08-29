CREATE TYPE "public"."staff_role" AS ENUM('staff', 'super_admin');--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "role" "staff_role" DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;