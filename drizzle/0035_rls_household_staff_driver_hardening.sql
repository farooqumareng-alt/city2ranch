-- Security remediation (audit findings P0/P1): closes a confirmed-live
-- self-escalation path plus the two RLS gaps that let a disabled staff
-- account or an assigned driver read data the app's own rules say they
-- shouldn't. Same defense-in-depth caveat as every RLS migration in
-- this project: the app's own DATABASE_URL is privileged and bypasses
-- RLS entirely, so everything here gates PostgREST/Studio access, not
-- the running app (which already enforces all of this independently).

-- ---------------------------------------------------------------------
-- P0: household_members.member_update_own had no WITH CHECK, so a
-- member could PATCH their own row directly via PostgREST to set
-- role = 'full' (self-escalating payment authority) or status =
-- 'active' on an owner-revoked row (self-reinstating access the owner
-- explicitly cut off). Postgres defaults a missing WITH CHECK to the
-- USING expression, which only constrains *who* can update the row,
-- never *what* they change it to.
--
-- The fix pins role and owner_auth_user_id to their existing values
-- (a member's own UPDATE can never touch either) and only allows the
-- exact status transitions the app's own actions ever perform for a
-- member acting on their own row: invited->active (accept),
-- invited->revoked (decline), active->revoked (leave). revoked->active
-- (self-reinstatement) is not in that list and is now rejected.
--
-- Also switches the auth.users subquery to auth.jwt() ->> 'email' —
-- `authenticated` is not guaranteed SELECT on auth.users by default,
-- so the old subquery risked erroring the whole policy (denying even
-- legitimate access) rather than cleanly evaluating false.
DROP POLICY IF EXISTS "member_select" ON "household_members";
--> statement-breakpoint
CREATE POLICY "member_select" ON "household_members" FOR SELECT TO "authenticated"
  USING (
    "member_auth_user_id" = auth.uid()
    OR lower("member_email") = lower(auth.jwt() ->> 'email')
  );
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
    AND "role" = (SELECT "role" FROM "household_members" AS "hm" WHERE "hm"."id" = "household_members"."id")
    AND "owner_auth_user_id" = (SELECT "owner_auth_user_id" FROM "household_members" AS "hm" WHERE "hm"."id" = "household_members"."id")
    AND (
      ("status" = 'active' AND (SELECT "status" FROM "household_members" AS "hm" WHERE "hm"."id" = "household_members"."id") = 'invited')
      OR ("status" = 'revoked' AND (SELECT "status" FROM "household_members" AS "hm" WHERE "hm"."id" = "household_members"."id") IN ('invited', 'active'))
    )
  );
--> statement-breakpoint

-- ---------------------------------------------------------------------
-- P1: 24 "staff_all" policies (across every staff-managed table) never
-- re-checked staff.is_active, so a disabled staff account kept full
-- PostgREST read/write on orders, live pricing, the audit trail, and
-- household_members. Every one of those policies is
-- `EXISTS (SELECT 1 FROM staff WHERE staff.auth_user_id = auth.uid())`
-- — and that inner SELECT against "staff" is itself subject to
-- staff's own RLS SELECT policy. Today that's only self_select, with
-- no is_active check, so a disabled row stays visible to every one of
-- those 24 subqueries. Adding is_active here closes all 24 at once,
-- with no changes to any of those other 24 policies required — this
-- is proven, not assumed: see src/lib/db/rls-security.test.ts.
DROP POLICY IF EXISTS "self_select" ON "staff";
--> statement-breakpoint
CREATE POLICY "self_select" ON "staff" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid() AND "is_active" = true);
--> statement-breakpoint

-- Same mechanism, same fix, for the disabled-driver half of the PIN
-- finding below: driver_select_assigned's EXISTS subquery against
-- "drivers" is likewise gated by drivers' own self_select policy.
DROP POLICY IF EXISTS "self_select" ON "drivers";
--> statement-breakpoint
CREATE POLICY "self_select" ON "drivers" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid() AND "is_active" = true);
--> statement-breakpoint

-- ---------------------------------------------------------------------
-- P1: driver_select_assigned is a row-level policy — it correctly
-- scopes an assigned driver to their own order, but grants every
-- column of that row, delivery_pin included, defeating the entire
-- "ask the customer in person" control (an active, currently-assigned
-- driver could read the PIN directly via PostgREST and mark an order
-- delivered without it ever being handed over). Column-level REVOKE is
-- safe here because the app never selects delivery_pin through the
-- browser's `authenticated`-role PostgREST client in the first place —
-- every legitimate read (the customer's order page, the driver's
-- confirm-delivery comparison) goes through the server's privileged
-- DATABASE_URL connection, which this REVOKE does not touch.
REVOKE SELECT ("delivery_pin") ON "orders" FROM "authenticated";
--> statement-breakpoint

-- ---------------------------------------------------------------------
-- P2: nothing stopped a household member from holding two
-- simultaneously-active memberships (accepting a new invite while
-- already an active member elsewhere), after which owner resolution
-- became nondeterministic. Backstop at the database level in addition
-- to the application-side fix in acceptHouseholdInvite.
CREATE UNIQUE INDEX "household_members_one_active_per_member" ON "household_members" ("member_auth_user_id") WHERE "status" = 'active';
--> statement-breakpoint

-- P3: member_email uniqueness was case-sensitive, so an out-of-band
-- mixed-case insert could create a duplicate invite the app's own
-- lower()-comparisons would then match twice. Additive — the existing
-- case-sensitive unique() constraint in schema.ts is left in place.
CREATE UNIQUE INDEX "household_members_owner_member_email_ci" ON "household_members" ("owner_auth_user_id", lower("member_email"));
