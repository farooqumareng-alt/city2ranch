-- Same defense-in-depth caveat as 0005/0007: the app's Drizzle
-- connection uses a privileged DATABASE_URL that never authenticates as
-- `authenticated`, so these policies gate PostgREST/Studio access, not
-- the running app itself. Real enforcement is the ownership check in
-- src/lib/actions/update-profile.ts.

ALTER TABLE "customer_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_select" ON "customer_profiles" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "self_update" ON "customer_profiles" FOR ALL TO "authenticated"
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "staff_all" ON "customer_profiles" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
