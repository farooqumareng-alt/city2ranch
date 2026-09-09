ALTER TABLE "drivers" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "license_expires_on" date;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "vehicle_make" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "vehicle_model" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "vehicle_year" integer;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "vehicle_plate" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "insurance_carrier" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "insurance_policy_number" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "insurance_expires_on" date;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "license_doc_path" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "insurance_doc_path" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "registration_doc_path" text;