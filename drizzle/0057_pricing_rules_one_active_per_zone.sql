-- Widens "exactly one active pricing rule" from per (market,
-- service_type) to per (market, service_type, zone_key) — Pricing
-- Engine Phase 2 lets a service type have several active rules at
-- once, one per distance zone, instead of exactly one flat rule.
-- COALESCE(zone_key, '') treats every unzoned row (zone_key NULL,
-- e.g. City Pickup's row) as sharing one identity, so the constraint
-- for an unzoned service is unchanged: still exactly one active row.
-- Safe: production has zero zoned rows as of this migration (all
-- existing rows have zone_key NULL), so every row trivially satisfies
-- the new, more specific constraint the same way it satisfied 0055's.
DROP INDEX "pricing_rules_one_active_per_market_service";--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_rules_one_active_per_market_service_zone" ON "pricing_rules" ("market", "service_type", COALESCE("zone_key", '')) WHERE "is_active";
