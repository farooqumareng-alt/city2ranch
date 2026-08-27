-- Same defense-in-depth caveat as every existing RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so this policy gates
-- PostgREST/Supabase Studio access, not the running app itself (the app
-- reads this table for a guest-open form via a plain query helper, no
-- Supabase Auth role involved).

ALTER TABLE "common_grocery_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "staff_all" ON "common_grocery_items" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
