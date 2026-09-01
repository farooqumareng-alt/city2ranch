-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- (including marking a notification read) is in
-- src/lib/actions/notifications.ts, via the privileged connection —
-- deliberately no self_update policy here, unlike
-- notification_preferences: there's no legitimate direct-write path
-- this table needs to support outside the app's own actions.

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_select" ON "notifications" FOR SELECT TO "authenticated"
  USING ("auth_user_id" = auth.uid());
--> statement-breakpoint

-- Same shape as every other staff_all policy in this schema — no inline
-- is_active check needed here: staff.self_select already requires it,
-- and this EXISTS subquery against "staff" is itself subject to that
-- policy (see the security-remediation migration that established this,
-- 0035_rls_household_staff_driver_hardening.sql), so a disabled staff
-- account is excluded transitively, not by repeating the check on every
-- table.
CREATE POLICY "staff_all" ON "notifications" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
