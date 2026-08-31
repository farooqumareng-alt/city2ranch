-- "Exactly one active pricing rule per market" was app-only (enforced
-- by getActivePricingRule() hard-throwing on 0 or >1 active rows) —
-- backed here at the database level too, matching the
-- membership_settings_singleton / household_members_one_active_per_member
-- precedent from the security remediation pass. Checked production
-- first: zero markets currently have more than one active row, so this
-- applies cleanly.
CREATE UNIQUE INDEX "pricing_rules_one_active_per_market" ON "pricing_rules" ("market") WHERE "is_active";
