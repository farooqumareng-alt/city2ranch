-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's own Drizzle connection uses a privileged
-- DATABASE_URL that never authenticates as "authenticated", so this
-- policy gates PostgREST/Studio access, not the running app itself —
-- real enforcement (requireSuperAdmin() on every write to a target
-- this log records) is in the app's own action layer.
ALTER TABLE "admin_audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- No self_select policy — there's no "owning" identity on an audit
-- log row the way there is on notifications or customer_places; any
-- active staff member reading the internal admin panel can see any
-- entry, same as every other staff_all-only table in this schema
-- (drivers, stores, pricing_rules, ...). Deliberately no update/delete
-- restriction beyond this either — an audit log's own rows are never
-- written to twice by design (create-once, see admin-audit.ts), so
-- there's nothing to lock down further yet.
CREATE POLICY "staff_all" ON "admin_audit_log" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
