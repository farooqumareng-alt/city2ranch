-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/recurring-service-plans.ts and the cron route.

ALTER TABLE "recurring_service_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_all" ON "recurring_service_plans" FOR ALL TO "authenticated"
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());
--> statement-breakpoint

CREATE POLICY "staff_all" ON "recurring_service_plans" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

ALTER TABLE "recurring_service_plan_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_all" ON "recurring_service_plan_items" FOR ALL TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "recurring_service_plans"
    WHERE "recurring_service_plans"."id" = "recurring_service_plan_items"."plan_id"
      AND "recurring_service_plans"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint

CREATE POLICY "staff_all" ON "recurring_service_plan_items" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
