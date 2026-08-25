-- Row Level Security for the Phase 2 tables. This is defense-in-depth,
-- NOT the app's real access control: the app talks to Postgres over
-- DATABASE_URL (a privileged connection that doesn't authenticate as
-- `authenticated` and never populates auth.uid()), so these policies
-- restrict PostgREST/Supabase Studio access, not the running app itself.
-- Real enforcement lives in the server actions/components (WHERE
-- auth_user_id = user.id, requireStaff() checks).

ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "customer_select_own" ON "service_requests" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "staff_all" ON "service_requests" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

CREATE POLICY "customer_select_own" ON "quotes" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "service_requests" sr
    WHERE sr."id" = "quotes"."request_id" AND sr."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "quotes" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

CREATE POLICY "customer_select_own" ON "payments" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "service_requests" sr
    WHERE sr."id" = "payments"."request_id" AND sr."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "payments" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

CREATE POLICY "self_select" ON "staff" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
