-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/household.ts and src/lib/household.ts.

ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- An owner sees/manages the rows they created.
CREATE POLICY "owner_all" ON "household_members" FOR ALL TO "authenticated"
  USING ("owner_auth_user_id" = auth.uid())
  WITH CHECK ("owner_auth_user_id" = auth.uid());
--> statement-breakpoint

-- A member sees their own membership row (to accept/decline/leave) —
-- SELECT is open to any invite matching their auth email so a pending
-- invite is visible before member_auth_user_id is ever set; write access
-- is scoped once member_auth_user_id is populated.
CREATE POLICY "member_select" ON "household_members" FOR SELECT TO "authenticated"
  USING (
    "member_auth_user_id" = auth.uid()
    OR lower("member_email") = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );
--> statement-breakpoint
CREATE POLICY "member_update_own" ON "household_members" FOR UPDATE TO "authenticated"
  USING (
    "member_auth_user_id" = auth.uid()
    OR lower("member_email") = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );
--> statement-breakpoint

CREATE POLICY "staff_all" ON "household_members" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
