-- Same shape as 0007_rls_marketing_leads.sql's three tables — a guest-
-- open lead form with no auth_user_id to scope a self-select policy by.
-- Staff gets full read/write access; the app's own writes (submission,
-- approval) go through a privileged direct Postgres connection and don't
-- need a policy of their own.

ALTER TABLE "driver_applications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "staff_all" ON "driver_applications" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
