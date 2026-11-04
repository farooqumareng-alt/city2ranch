"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireManager } from "@/lib/auth/roles";
import { pricingRuleSchema, pricingRuleUpdateSchema } from "@/lib/validation/schemas";
import { occupiesSameZoneSlot } from "@/lib/pricing/zone-scope";
import { getZoneReadiness, summarizeZoneSet } from "@/lib/pricing/zone-readiness";
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
  "stripeFeePercent",
  "stripeFeeFixedCents",
  "zoneKey",
  "zoneLabel",
  "zoneMinMiles",
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
    stripeFeePercent: formData.get("stripeFeePercent"),
    stripeFeeFixedCents: formData.get("stripeFeeFixedCents"),
  };
}

function zoneFieldsFromForm(formData: FormData) {
  return {
    zoneKey: formData.get("zoneKey"),
    zoneLabel: formData.get("zoneLabel"),
    zoneMinMiles: formData.get("zoneMinMiles"),
  };
}

/**
 * Cross-row zone validation (Phase 2) — zod can only see one row's own
 * fields, but "does another zone already start at this mileage" and
 * "does this service type already mix zoned and unzoned rows" both
 * require looking at sibling rows in (market, service_type). Checked
 * against every row regardless of isActive — an inactive row's zone
 * could still be activated later, so validating only active rows
 * would let a conflict get saved silently and only surface as a
 * hard-fail at activation or suggestion time instead of at save time.
 *
 * Since Build 2's threshold semantics (2026-11-04) there is no
 * overlap check anymore — zones can't overlap when each is just a
 * starting mileage. The one geometric conflict left is two zones
 * starting at the SAME mileage, which would make matching ambiguous.
 *
 * excludeId is the row being edited (never compared against itself).
 */
async function validateZoneAgainstSiblings(
  db: ReturnType<typeof getDb>,
  market: string,
  serviceType: "pickup" | "concierge",
  zone: { zoneKey?: string; zoneMinMiles?: number },
  excludeId?: string
): Promise<string | null> {
  const siblings = (
    await db
      .select({
        id: pricingRules.id,
        zoneKey: pricingRules.zoneKey,
        zoneMinMiles: pricingRules.zoneMinMiles,
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

  // Saving a zoned rule — reject if any sibling is unzoned, or if
  // another zone already starts at the same mileage.
  if (siblings.some((row) => row.zoneKey == null)) {
    return "This service type already has a flat (non-zoned) pricing rule — it must be removed before adding zones.";
  }

  const duplicateStart = siblings.some(
    (row) => row.zoneMinMiles != null && zone.zoneMinMiles != null && Number(row.zoneMinMiles) === zone.zoneMinMiles
  );
  return duplicateStart
    ? `Another zone already starts at ${zone.zoneMinMiles} miles for this service type — each zone needs its own starting mileage (a zone runs from its start until the next zone's start).`
    : null;
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
        stripeFeePercent: parsed.data.stripeFeePercent == null ? null : String(parsed.data.stripeFeePercent),
        zoneMinMiles: parsed.data.zoneMinMiles == null ? null : String(parsed.data.zoneMinMiles),
        // Legacy band column — threshold semantics since Build 2; the
        // form no longer collects it and matching never reads it.
        zoneMaxMiles: null,
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
        stripeFeePercent: parsed.data.stripeFeePercent == null ? null : String(parsed.data.stripeFeePercent),
        zoneMinMiles: parsed.data.zoneMinMiles == null ? null : String(parsed.data.zoneMinMiles),
        // Legacy band column — see createPricingRule.
        zoneMaxMiles: null,
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

/**
 * Activate a service type's whole zone set in one transaction
 * (Build 2, 2026-11-04 — QA audit C2R-QA-006). Per-zone activation
 * alone left "is Concierge pricing live?" unanswerable: zones went
 * live one click at a time, so some mileages auto-priced while others
 * silently fell back to manual quotes, and the four seeded Concierge
 * zones sat at Ready For Review indefinitely with no single action
 * that meant "launch the set". This is that action:
 *
 * - Refuses the whole set when ANY zoned rule for the service type is
 *   still incomplete (summarizeZoneSet — the same readiness math as
 *   the per-row gate and the admin list), naming each incomplete zone
 *   and what it's missing. Nothing is activated partially.
 * - Otherwise activates every not-yet-active zoned rule atomically,
 *   deactivating any other active row holding the same zone slot
 *   (an older versioned row for that zoneKey), exactly like
 *   activatePricingRule does for one slot.
 * - Already-active zones are untouched and don't block the set.
 */
export async function activatePricingZoneSet(
  serviceType: "pickup" | "concierge",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState calling convention, same as activatePricingRule
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  const staffMember = await requireManager();

  const db = getDb();
  // "default" market — same placeholder as createPricingRule.
  const rows = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.market, "default"), eq(pricingRules.serviceType, serviceType)));
  const zoned = rows.filter((r) => r.zoneKey != null);
  if (zoned.length === 0) {
    return { ok: false, message: "This service has no zoned pricing rules to activate." };
  }

  const summary = summarizeZoneSet(
    zoned.map((r) => ({
      ...r,
      targetMarginPercent: r.targetMarginPercent == null ? null : Number(r.targetMarginPercent),
    }))
  );
  if (summary.incomplete.length > 0) {
    const detail = summary.incomplete.map((z) => `${z.zoneKey} (missing: ${z.missing.join(", ")})`).join("; ");
    return { ok: false, message: `The zone set can't go live yet — incomplete zones: ${detail}.` };
  }

  const toActivate = zoned.filter((r) => !r.isActive);
  if (toActivate.length === 0) {
    return { ok: false, message: "Every zone in this set is already active." };
  }

  try {
    let deactivatedIds: string[] = [];
    await db.transaction(async (tx) => {
      const candidates = await tx
        .select({
          id: pricingRules.id,
          market: pricingRules.market,
          serviceType: pricingRules.serviceType,
          zoneKey: pricingRules.zoneKey,
        })
        .from(pricingRules)
        .where(and(eq(pricingRules.market, "default"), eq(pricingRules.serviceType, serviceType)));
      const targetIds = new Set(toActivate.map((r) => r.id));
      deactivatedIds = candidates
        .filter((c) => !targetIds.has(c.id) && toActivate.some((t) => occupiesSameZoneSlot(t, c)))
        .map((c) => c.id);

      if (deactivatedIds.length > 0) {
        await tx
          .update(pricingRules)
          .set({ isActive: false, updatedAt: new Date() })
          .where(inArray(pricingRules.id, deactivatedIds));
      }
      await tx
        .update(pricingRules)
        .set({ isActive: true, updatedAt: new Date() })
        .where(inArray(pricingRules.id, [...targetIds]));
    });

    await logAdminAuditEvent({
      actorStaffId: staffMember.id,
      action: "pricing_zone_set_activated",
      targetType: "pricing_rule_set",
      targetId: serviceType,
      before: null,
      after: { activatedRuleIds: toActivate.map((r) => r.id), deactivatedRuleIds: deactivatedIds },
    });
  } catch (error) {
    console.error("[activatePricingZoneSet] failed", error);
    return { ok: false, message: "We couldn't activate this zone set right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
