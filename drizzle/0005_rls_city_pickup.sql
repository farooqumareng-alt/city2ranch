-- Row Level Security for the City Pickup tables. Defense-in-depth only —
-- the app talks to Postgres over a privileged DATABASE_URL connection
-- that doesn't authenticate as `authenticated` and never populates
-- auth.uid(), so these policies restrict PostgREST/Supabase Studio
-- access, not the running app itself. Real enforcement is the
-- requireStaff()/requireDriver()/ownership checks inside server actions.

-- service_requests lost its auth_user_id column in the revert migration
-- (0003) — it's guest-only lead capture again, so there's no customer
-- self-select policy left, just staff visibility.
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "staff_all" ON "service_requests" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zip_mileage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "customer_select_own" ON "orders" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "driver_select_assigned" ON "orders" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "drivers"
    WHERE "drivers"."auth_user_id" = auth.uid() AND "drivers"."id" = "orders"."driver_id"
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "orders" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

CREATE POLICY "self_select" ON "drivers" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "staff_all" ON "drivers" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

-- Pure business-configuration/internal-record tables — staff only, no
-- customer or driver access needed.
CREATE POLICY "staff_all" ON "stores" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "pricing_rules" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "zip_mileage" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "audit_events" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
