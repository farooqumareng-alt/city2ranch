-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/driver-messages.ts.
--
-- Closes a real gap: driver_messages' own creation migration
-- (0060_sharp_carnage.sql) never enabled RLS at all, unlike every other
-- table in this project (order_messages' identical shape got its own
-- 0025 migration right after its 0024 creation) — flagged by Supabase's
-- own security scanner and confirmed live in production before this fix.

ALTER TABLE "driver_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "driver_select_own" ON "driver_messages" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "drivers"
    WHERE "drivers"."id" = "driver_messages"."driver_id" AND "drivers"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "driver_messages" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
