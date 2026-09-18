-- Added nullable first so existing rows can backfill to their own
-- created_at (an honest "last touched" answer for a row that's never
-- actually been edited) rather than drizzle-kit's default-generated
-- "now()", which would make every pre-existing row look like it was
-- just modified by this migration.
ALTER TABLE "pricing_rules" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "pricing_rules" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "updated_at" SET NOT NULL;
