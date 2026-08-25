ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "payments" CASCADE;--> statement-breakpoint
DROP TABLE "quotes" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "customer_select_own" ON "service_requests";--> statement-breakpoint
DROP POLICY IF EXISTS "staff_all" ON "service_requests";--> statement-breakpoint
ALTER TABLE "service_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_requests" DROP CONSTRAINT "service_requests_auth_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::text::"public"."lead_status";--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "service_requests" DROP COLUMN "auth_user_id";--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
DROP TYPE "public"."request_status";