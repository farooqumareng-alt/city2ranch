-- Splits the single "Delivery instructions" freeform field into a short
-- structured gate_code, a dropoff_location picked from a fixed common
-- set, and access_notes as the remaining true-freeform catch-all.
-- Renaming (not drop+add) preserves any delivery_instructions text
-- already saved by an early customer_places row.

ALTER TABLE "customer_places" RENAME COLUMN "delivery_instructions" TO "access_notes";
--> statement-breakpoint
ALTER TABLE "customer_places" ADD COLUMN "gate_code" text;
--> statement-breakpoint
ALTER TABLE "customer_places" ADD COLUMN "dropoff_location" text;
