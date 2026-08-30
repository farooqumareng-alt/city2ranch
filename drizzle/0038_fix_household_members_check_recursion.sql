-- Fixes a real bug in 0035's own fix: member_update_own's WITH CHECK
-- referenced household_members from inside a policy ON household_members
-- ("SELECT role FROM household_members hm WHERE hm.id = ...") to compare
-- the proposed new row against its pre-update values. That subquery is
-- itself subject to household_members' own RLS — including this same
-- policy — which Postgres detects and refuses to evaluate:
-- "infinite recursion detected in policy for relation household_members".
-- Caught by the new src/lib/db/rls-security.test.ts suite, which is
-- exactly what it's for — every one of the P0 scenarios failed outright
-- (not "wrongly allowed", but errored) until this migration.
--
-- Standard fix: a SECURITY DEFINER function, owned by the table's own
-- owner (verified: "postgres" owns household_members, and this
-- migration runs as that same role), so its internal SELECT runs with
-- the owner's privileges — which bypass RLS by default (this table has
-- ENABLE, not FORCE, ROW LEVEL SECURITY) — instead of the calling
-- policy's, breaking the recursion.
CREATE OR REPLACE FUNCTION household_members_prior_values(row_id uuid)
RETURNS TABLE (role household_role, status household_member_status, owner_auth_user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role, status, owner_auth_user_id FROM household_members WHERE id = row_id;
$$;
--> statement-breakpoint

DROP POLICY IF EXISTS "member_update_own" ON "household_members";
--> statement-breakpoint
CREATE POLICY "member_update_own" ON "household_members" FOR UPDATE TO "authenticated"
  USING (
    "member_auth_user_id" = auth.uid()
    OR lower("member_email") = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    "member_auth_user_id" = auth.uid()
    AND "role" = (SELECT "role" FROM household_members_prior_values("household_members"."id"))
    AND "owner_auth_user_id" = (SELECT "owner_auth_user_id" FROM household_members_prior_values("household_members"."id"))
    AND (
      ("status" = 'active' AND (SELECT "status" FROM household_members_prior_values("household_members"."id")) = 'invited')
      OR ("status" = 'revoked' AND (SELECT "status" FROM household_members_prior_values("household_members"."id")) IN ('invited', 'active'))
    )
  );
