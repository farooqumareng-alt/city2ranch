-- Same defense-in-depth caveat as 0009 (customer_profiles): the app's
-- Drizzle connection uses a privileged DATABASE_URL that never
-- authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is the ownership check in src/lib/actions/places.ts.

ALTER TABLE "customer_places" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_select" ON "customer_places" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "self_all" ON "customer_places" FOR ALL TO "authenticated"
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "staff_all" ON "customer_places" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
