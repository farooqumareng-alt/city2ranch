CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'converted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('groceries', 'private_shopping', 'essentials', 'hardware', 'pet_ranch', 'packages', 'restaurant', 'errands', 'other');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founding_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"zip" text NOT NULL,
	"property_location" text NOT NULL,
	"preferred_stores" text,
	"shopping_frequency" text NOT NULL,
	"services_needed" text,
	"preferred_days" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_area_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"zip" text NOT NULL,
	"city" text NOT NULL,
	"preferred_frequency" text NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"service_type" "service_type" NOT NULL,
	"preferred_store" text,
	"shopping_list" text,
	"estimated_order_value" text,
	"timing_preference" text NOT NULL,
	"notes" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL
);
