CREATE TABLE "driver_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"zip" text NOT NULL,
	"vehicle" text NOT NULL,
	"has_license_and_insurance" boolean NOT NULL,
	"availability" text,
	"motivation" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL
);
