-- Same defense-in-depth caveat as 0009/0019/0025: the app's Drizzle
-- connection uses a privileged DATABASE_URL that never authenticates as
-- `authenticated`, so these policies gate PostgREST/Studio access, not
-- the running app itself. Real enforcement is in
-- src/lib/actions/notification-preferences.ts.

ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_select" ON "notification_preferences" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "self_update" ON "notification_preferences" FOR ALL TO "authenticated"
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());
--> statement-breakpoint

CREATE POLICY "staff_all" ON "notification_preferences" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
