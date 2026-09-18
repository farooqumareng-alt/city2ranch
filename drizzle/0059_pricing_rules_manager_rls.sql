-- Tightens pricing_rules' RLS from "any active staff row" to "active
-- manager or super_admin" — the app-level gate (requireManager(), see
-- pricing-management.ts) has been manager-only since the granular RBAC
-- pass, but this policy predates that split and was never tightened to
-- match, leaving any active plain-staff account able to read/write
-- pricing_rules directly via Supabase's Data API/Studio (defense-in-
-- depth only; the app's own DATABASE_URL connection never authenticates
-- as "authenticated" and is unaffected either way — see every other RLS
-- migration's own caveat).
--
-- The EXISTS subquery below is itself subject to staff's own self_select
-- policy (auth_user_id = auth.uid() AND is_active = true), so the added
-- role filter composes correctly: only the caller's own row, and only
-- while it's active, is ever checked against the role list — a disabled
-- manager still loses access entirely, exactly as before.
DROP POLICY "staff_all" ON "pricing_rules";--> statement-breakpoint
CREATE POLICY "manager_all" ON "pricing_rules" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid() AND "staff"."role" IN ('manager', 'super_admin')));
