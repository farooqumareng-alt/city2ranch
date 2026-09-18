"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireManager } from "@/lib/auth/roles";
import { pricingRuleSchema, pricingRuleUpdateSchema } from "@/lib/validation/schemas";
import { occupiesSameZoneSlot } from "@/lib/pricing/zone-scope";
import { getZoneReadiness } from "@/lib/pricing/zone-readiness";
import { logAdminAuditEvent } from "@/lib/admin-audit";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const CREATE_FORM_FIELDS = [
  "serviceType",
  "serviceLabel",
  "baseFeeCents",
  "perMileCents",
  "minFeeCents",
  "note",
  "contractorFlatCostCents",
  "contractorPerMileCostCents",
  "sustainableCostAllowanceCents",
  "targetMarginPercent",
  "zoneKey",
  "zoneLabel",
  "zoneMinMiles",
  "zoneMaxMiles",
];
// serviceType omitted — see pricingRuleUpdateSchema's own doc comment.
const UPDATE_FORM_FIELDS = CREATE_FORM_FIELDS.filter((f) => f !== "serviceType");
const LIST_PATH = "/internal/dispatch/pricing";

export async function listPricingRules() {
  await requireManager();
  const db = getDb();
  return db.select().from(pricingRules).orderBy(pricingRules.createdAt);
}

function costFieldsFromForm(formData: FormData) {
  return {
    contractorFlatCostCents: formData.get("contractorFlatCostCents"),
    contractorPerMileCostCents: formData.get("contractorPerMileCostCents"),
    sustainableCostAllowanceCents: formData.get("sustainableCostAllowanceCents"),
    targetMarginPercent: formData.get("targetMarginPercent"),
  };
}

function zoneFieldsFromForm(formData: FormData) {
  return {
    zoneKey: formData.get("zoneKey"),
    zoneLabel: formData.get("zoneLabel"),
    zoneMinMiles: formData.get("zoneMinMiles"),
    zoneMaxMiles: formData.get("zoneMaxMiles"),
  };
}

/**
 * Cross-row zone validation (Phase 2) — zod can only see one row's own
 * fields, but "does this zone overlap another rule's zone" and "does
 * this service type already mix zoned and unzoned rows" both require
 * looking at sibling rows in (market, service_type). Checked against
 * every row regardless of isActive — an inactive row's zone could still
 * be activated later, so validating only active rows would let an
 * overlap get saved silently and only surface as a hard-fail at
 * activation or suggestion time instead of at save time.
 *
 * excludeId is the row being edited (never compared against itself).
 */
async function validateZoneAgainstSiblings(
  db: ReturnType<typeof getDb>,
  market: string,
  serviceType: "pickup" | "concierge",
  zone: { zoneKey?: string; zoneMinMiles?: number; zoneMaxMiles?: number },
  excludeId?: string
): Promise<string | null> {
  const siblings = (
    await db
      .select({
        id: pricingRules.id,
        zoneKey: pricingRules.zoneKey,
        zoneMinMiles: pricingRules.zoneMinMiles,
        zoneMaxMiles: pricingRules.zoneMaxMiles,
      })
      .from(pricingRules)
      .where(and(eq(pricingRules.market, market), eq(pricingRules.serviceType, serviceType)))
  ).filter((row) => row.id !== excludeId);

  if (zone.zoneKey == null) {
    // Saving an unzoned rule — reject if any sibling is zoned.
    return siblings.some((row) => row.zoneKey != null)
      ? "This service type already has zoned pricing rules configured — a flat (non-zoned) rule can't coexist with them."
      : null;
  }

  // Saving a zoned rule — reject if any sibling is unzoned, or if its
  // mileage band overlaps another zone's.
  if (siblings.some((row) => row.zoneKey == null)) {
    return "This service type already has a flat (non-zoned) pricing rule — it must be removed before adding zones.";
  }

  const min = zone.zoneMinMiles ?? 0;
  const max = zone.zoneMaxMiles ?? Infinity;
  const overlaps = siblings.some((row) => {
    const otherMin = row.zoneMinMiles == null ? 0 : Number(row.zoneMinMiles);
    const otherMax = row.zoneMaxMiles == null ? Infinity : Number(row.zoneMaxMiles);
    return min < otherMax && otherMin < max;
  });
  return overlaps ? "This zone's mileage range overlaps another zone already configured for this service type." : null;
}

/**
 * New rules are always created inactive — "exactly one active row per
 * (market, service type)" (the invariant getActivePricingRule() hard-
 * throws on) is only ever changed by activatePricingRule below, never
 * by create/update. Keeping that a single, narrow code path is what
 * makes the zero-active and multiple-active states unreachable through
 * this UI.
 */
export async function createPricingRule(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const staffMember = await requireManager();

  const parsed = pricingRuleSchema.safeParse({
    serviceType: formData.get("serviceType"),
    serviceLabel: formData.get("serviceLabel"),
    baseFeeCents: formData.get("baseFeeCents"),
    perMileCents: formData.get("perMileCents"),
    minFeeCents: formData.get("minFeeCents"),
    note: formData.get("note"),
    ...costFieldsFromForm(formData),
    ...zoneFieldsFromForm(formData),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, CREATE_FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    // "default" — see pricingRules.market's own doc comment; there's no
    // market-switcher UI yet, so every row is this one placeholder slug.
    const zoneError = await validateZoneAgainstSiblings(db, "default", parsed.data.serviceType, parsed.data);
    if (zoneError) {
      return { ok: false, message: zoneError, values: valuesFromFormData(formData, CREATE_FORM_FIELDS) };
    }

    const inserted = await db
      .insert(pricingRules)
      .values({
        ...parsed.data,
        isActive: false,
        // numeric columns round-trip as strings for drizzle-orm/postgres-js
        // (same convention as zip_mileage.roundTripMiles elsewhere).
        targetMarginPercent: parsed.data.targetMarginPercent == null ? null : String(parsed.data.targetMarginPercent),
        zoneMinMiles: parsed.data.zoneMinMiles == null ? null : String(parsed.data.zoneMinMiles),
        zoneMaxMiles: parsed.data.zoneMaxMiles == null ? null : String(parsed.data.zoneMaxMiles),
      })
      .returning({ id: pricingRules.id });

    await logAdminAuditEvent({
      actorStaffId: staffMember.id,
      action: "pricing_rule_created",
      targetType: "pricing_rule",
      targetId: inserted[0].id,
      before: null,
      after: { ...parsed.data, isActive: false },
    });
  } catch (error) {
    console.error("[createPricingRule] failed", error);
    return {
      ok: false,
      message: "We couldn't save this pricing rule right now. Please try again shortly.",
      values: valuesFromFormData(formData, CREATE_FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/** Never touches isActive (see createPricingRule's doc comment) or
 *  serviceType (see pricingRuleUpdateSchema's doc comment). */
export async function updatePricingRule(
  ruleId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const staffMember = await requireManager();

  const parsed = pricingRuleUpdateSchema.safeParse({
    serviceLabel: formData.get("serviceLabel"),
    baseFeeCents: formData.get("baseFeeCents"),
    perMileCents: formData.get("perMileCents"),
    minFeeCents: formData.get("minFeeCents"),
    note: formData.get("note"),
    ...costFieldsFromForm(formData),
    ...zoneFieldsFromForm(formData),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, UPDATE_FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    // Full row, not just market/serviceType — also the "before" audit
    // snapshot below, and the zone-overlap check still only needs the
    // two fields it always did.
    const existingRows = await db.select().from(pricingRules).where(eq(pricingRules.id, ruleId));
    const existing = existingRows[0];
    if (!existing) {
      return { ok: false, message: "Pricing rule not found.", values: valuesFromFormData(formData, UPDATE_FORM_FIELDS) };
    }

    const zoneError = await validateZoneAgainstSiblings(
      db,
      existing.market,
      existing.serviceType,
      parsed.data,
      ruleId
    );
    if (zoneError) {
      return { ok: false, message: zoneError, values: valuesFromFormData(formData, UPDATE_FORM_FIELDS) };
    }

    await db
      .update(pricingRules)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
        targetMarginPercent: parsed.data.targetMarginPercent == null ? null : String(parsed.data.targetMarginPercent),
        zoneMinMiles: parsed.data.zoneMinMiles == null ? null : String(parsed.data.zoneMinMiles),
        zoneMaxMiles: parsed.data.zoneMaxMiles == null ? null : String(parsed.data.zoneMaxMiles),
      })
      .where(eq(pricingRules.id, ruleId));

    await logAdminAuditEvent({
      actorStaffId: staffMember.id,
      action: "pricing_rule_updated",
      targetType: "pricing_rule",
      targetId: ruleId,
      before: existing,
      after: parsed.data,
    });
  } catch (error) {
    console.error("[updatePricingRule] failed", error);
    return {
      ok: false,
      message: "We couldn't save this pricing rule right now. Please try again shortly.",
      values: valuesFromFormData(formData, UPDATE_FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/**
 * The only way "which rule is active" ever changes — a mutually
 * exclusive "radio button" scoped to (market, service type, zone), not
 * a per-row boolean toggle. Runs inside one transaction so the database
 * is never observed with zero or multiple active rows for the same
 * slot, backed by a real partial unique index
 * (pricing_rules_one_active_per_market_service_zone) as a database-level
 * guarantee, not just this code path's discipline.
 *
 * Scoped by service_type as of Pricing Engine Phase 1 (2026-09-15) —
 * before that column existed, deactivating every other row in the same
 * market was correct, because a market only ever had one rule at all.
 * Once Concierge got its own rule sharing market='default' with City
 * Pickup, that same query would have deactivated City Pickup's live
 * rule the first time anyone activated a Concierge one. Caught before
 * shipping, not found in production.
 *
 * Scoped by zone as of Phase 2 (2026-09-17) — a zoned service can have
 * several active rules at once, one per zone, so deactivating "every
 * other row in the same market+service type" would now wrongly kill
 * every sibling zone the moment any one of them is activated. Rather
 * than hand-writing a null-safe SQL condition (SQL's `=` never matches
 * two NULLs, unlike JS's `===`) and hoping it matches the tested truth
 * table, this fetches the (already narrow — market+service type)
 * candidate rows and filters them with the same occupiesSameZoneSlot()
 * predicate zone-scope.test.ts covers directly — the code path that
 * runs and the code path that's tested are the same function. An
 * unzoned rule (zoneKey null, e.g. City Pickup's) still only ever
 * deactivates the other unzoned row in its market+service type, exactly
 * like before this change — zone-scoping is purely additive for a
 * service that never configures zones.
 *
 * Gated by getZoneReadiness() as of 2026-09-18 — before this, nothing
 * stopped a manager from activating a still-placeholder row (e.g. one
 * of the 4 seeded Concierge zones, $0.01 base fee, every cost field
 * null) straight to production. A row already active is exempt (see
 * that function's own isActive-wins rule) — this only judges the
 * inactive → active transition itself, never retroactively.
 */
export async function activatePricingRule(
  ruleId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention (via JobActionButton), unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  const staffMember = await requireManager();

  const db = getDb();
  const rows = await db.select().from(pricingRules).where(eq(pricingRules.id, ruleId));
  const rule = rows[0];
  if (!rule) return { ok: false, message: "Pricing rule not found." };

  // targetMarginPercent round-trips as a string for drizzle-orm/
  // postgres-js (numeric column) — same conversion as repository.ts's
  // mapRow(); getZoneReadiness only null-checks it, but its type is
  // the honest number|null shape every other consumer expects.
  const readiness = getZoneReadiness({
    ...rule,
    targetMarginPercent: rule.targetMarginPercent == null ? null : Number(rule.targetMarginPercent),
  });
  if (readiness.status !== "ready_for_review") {
    return {
      ok: false,
      message:
        readiness.status === "active"
          ? "This rule is already active."
          : `This rule isn't ready to activate yet — missing: ${readiness.missing.join(", ")}.`,
    };
  }

  try {
    let deactivatedIds: string[] = [];
    await db.transaction(async (tx) => {
      const candidates = await tx
        .select({ id: pricingRules.id, market: pricingRules.market, serviceType: pricingRules.serviceType, zoneKey: pricingRules.zoneKey })
        .from(pricingRules)
        .where(and(eq(pricingRules.market, rule.market), eq(pricingRules.serviceType, rule.serviceType), ne(pricingRules.id, ruleId)));
      deactivatedIds = candidates.filter((c) => occupiesSameZoneSlot(rule, c)).map((c) => c.id);

      if (deactivatedIds.length > 0) {
        await tx
          .update(pricingRules)
          .set({ isActive: false, updatedAt: new Date() })
          .where(inArray(pricingRules.id, deactivatedIds));
      }
      await tx.update(pricingRules).set({ isActive: true, updatedAt: new Date() }).where(eq(pricingRules.id, ruleId));
    });

    await logAdminAuditEvent({
      actorStaffId: staffMember.id,
      action: "pricing_rule_activated",
      targetType: "pricing_rule",
      targetId: ruleId,
      before: { isActive: false },
      after: { isActive: true, deactivatedRuleIds: deactivatedIds },
    });
  } catch (error) {
    console.error("[activatePricingRule] failed", error);
    return { ok: false, message: "We couldn't activate this pricing rule right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
