"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireManager } from "@/lib/auth/roles";
import { pricingRuleSchema, pricingRuleUpdateSchema } from "@/lib/validation/schemas";
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
  await requireManager();

  const parsed = pricingRuleSchema.safeParse({
    serviceType: formData.get("serviceType"),
    serviceLabel: formData.get("serviceLabel"),
    baseFeeCents: formData.get("baseFeeCents"),
    perMileCents: formData.get("perMileCents"),
    minFeeCents: formData.get("minFeeCents"),
    note: formData.get("note"),
    ...costFieldsFromForm(formData),
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
    await db.insert(pricingRules).values({
      ...parsed.data,
      isActive: false,
      // numeric columns round-trip as strings for drizzle-orm/postgres-js
      // (same convention as zip_mileage.roundTripMiles elsewhere).
      targetMarginPercent: parsed.data.targetMarginPercent == null ? null : String(parsed.data.targetMarginPercent),
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
  await requireManager();

  const parsed = pricingRuleUpdateSchema.safeParse({
    serviceLabel: formData.get("serviceLabel"),
    baseFeeCents: formData.get("baseFeeCents"),
    perMileCents: formData.get("perMileCents"),
    minFeeCents: formData.get("minFeeCents"),
    note: formData.get("note"),
    ...costFieldsFromForm(formData),
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
    await db
      .update(pricingRules)
      .set({
        ...parsed.data,
        targetMarginPercent: parsed.data.targetMarginPercent == null ? null : String(parsed.data.targetMarginPercent),
      })
      .where(eq(pricingRules.id, ruleId));
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
 * exclusive "radio button" scoped to (market, service type), not a
 * per-row boolean toggle. Runs inside one transaction so the database
 * is never observed with zero or multiple active rows for the same
 * service type, backed by a real partial unique index
 * (pricing_rules_one_active_per_market_service) as a database-level
 * guarantee, not just this code path's discipline.
 *
 * Scoped by service_type as of Pricing Engine Phase 1 (2026-09-15) —
 * before that column existed, deactivating every other row in the same
 * market was correct, because a market only ever had one rule at all.
 * Once Concierge got its own rule sharing market='default' with City
 * Pickup, that same query would have deactivated City Pickup's live
 * rule the first time anyone activated a Concierge one. Caught before
 * shipping, not found in production.
 */
export async function activatePricingRule(
  ruleId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention (via JobActionButton), unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  await requireManager();

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ market: pricingRules.market, serviceType: pricingRules.serviceType })
        .from(pricingRules)
        .where(eq(pricingRules.id, ruleId));
      const rule = rows[0];
      if (!rule) throw new Error("Pricing rule not found.");

      await tx
        .update(pricingRules)
        .set({ isActive: false })
        .where(
          and(
            eq(pricingRules.market, rule.market),
            eq(pricingRules.serviceType, rule.serviceType),
            ne(pricingRules.id, ruleId)
          )
        );
      await tx.update(pricingRules).set({ isActive: true }).where(eq(pricingRules.id, ruleId));
    });
  } catch (error) {
    console.error("[activatePricingRule] failed", error);
    return { ok: false, message: "We couldn't activate this pricing rule right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
