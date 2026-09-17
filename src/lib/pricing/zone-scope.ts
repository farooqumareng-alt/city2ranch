/**
 * Split out of pricing-management.ts (2026-09-17) — a "use server" file
 * can only export async functions, and this is a plain sync predicate.
 * Same fix as inbox-types.ts's split from inbox.ts: the DB-free logic
 * moves to its own module rather than becoming async for no reason.
 */

/**
 * Whether `candidate` occupies the same (market, service_type, zone)
 * slot as `rule` — i.e. should be deactivated when `rule` is activated.
 * A plain JS `===` between two zoneKeys is already null-safe (`null
 * === null` is `true`), unlike SQL's `=` (`NULL = NULL` is never true)
 * — activatePricingRule() in pricing-management.ts builds the
 * equivalent isNull/eq Drizzle condition for its real WHERE clause,
 * since fetching every row and filtering in JS doesn't scale, but this
 * pure version is what gets unit-tested directly (see
 * pricing-management.test.ts) — a mutating action's own DB call can't
 * be exercised in this codebase's test suite without a live
 * transaction, the same limit noted on every other mutating action
 * here.
 */
export function occupiesSameZoneSlot(
  rule: { market: string; serviceType: string; zoneKey: string | null },
  candidate: { market: string; serviceType: string; zoneKey: string | null }
): boolean {
  return (
    rule.market === candidate.market && rule.serviceType === candidate.serviceType && rule.zoneKey === candidate.zoneKey
  );
}
