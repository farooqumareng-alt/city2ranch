-- Closes a real gap: these three marketing lead-capture tables were left
-- out of the 0005 RLS pass (which only covered City Pickup tables) and
-- had Row Level Security disabled. Supabase exposes every public-schema
-- table through PostgREST using the anon key, which is embedded in the
-- browser bundle by design — safe only when RLS is enabled to gate it.
-- With RLS off, anyone with the project URL could read/edit/delete every
-- row (name, email, phone, property location) in these tables via the
-- REST API, regardless of anything this app's own server actions check.
--
-- Same defense-in-depth caveat as 0005: the app itself never talks to
-- these tables through PostgREST — server actions insert via a
-- privileged direct Postgres connection (src/lib/actions/*.ts), so no
-- policy is needed to permit the app's own writes. Staff gets read
-- access for when a future admin UI needs it; there is no public
-- self-select policy since these are guest submissions with no
-- auth_user_id to scope by.

ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "founding_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_area_leads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "staff_all" ON "contact_messages" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "founding_members" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "service_area_leads" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
