-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/membership.ts and the Stripe webhook route.

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Read-only for the customer: unlike customer_profiles or places, a
-- membership's status/tier is billing truth written only by the Stripe
-- webhook (via the privileged connection) — a customer granting
-- themselves "active" through a direct PostgREST write would be a real
-- billing bypass, so there's deliberately no self_update policy here.
CREATE POLICY "self_select" ON "memberships" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint

CREATE POLICY "staff_all" ON "memberships" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

ALTER TABLE "membership_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- No customer-facing policy at all — this is an internal admin flag,
-- not owner-scoped data. Default-deny for "authenticated" is correct;
-- only staff should ever see or change it.
CREATE POLICY "staff_all" ON "membership_settings" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
