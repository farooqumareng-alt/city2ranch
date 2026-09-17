-- Widens "exactly one active pricing rule" from per-market to per
-- (market, service_type) — the previous index (0039) predates
-- pricing_rules having a service_type at all, and blocked a Concierge
-- rule from ever being active at the same time as City Pickup's (both
-- market='default'). Safe: production currently has exactly one row,
-- market='default', now backfilled service_type='pickup' by migration
-- 0054 — it trivially satisfies the new, more specific constraint.
DROP INDEX "pricing_rules_one_active_per_market";--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_rules_one_active_per_market_service" ON "pricing_rules" ("market", "service_type") WHERE "is_active";
