"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { pricingRules } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { pricingRuleSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const FORM_FIELDS = ["serviceLabel", "baseFeeCents", "perMileCents", "minFeeCents", "note"];
const LIST_PATH = "/internal/dispatch/pricing";

export async function listPricingRules() {
  await requireStaff();
  const db = getDb();
  return db.select().from(pricingRules).orderBy(pricingRules.createdAt);
}

function parsePricingRule(formData: FormData) {
  return pricingRuleSchema.safeParse({
    serviceLabel: formData.get("serviceLabel"),
    baseFeeCents: formData.get("baseFeeCents"),
    perMileCents: formData.get("perMileCents"),
    minFeeCents: formData.get("minFeeCents"),
    note: formData.get("note"),
  });
}

/**
 * New rules are always created inactive — "exactly one active row" (the
 * invariant getActivePricingRule() hard-throws on) is only ever changed
 * by activatePricingRule below, never by create/update. Keeping that a
 * single, narrow code path is what makes the zero-active and
 * multiple-active states unreachable through this UI.
 */
export async function createPricingRule(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = parsePricingRule(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db.insert(pricingRules).values({ ...parsed.data, isActive: false });
  } catch (error) {
    console.error("[createPricingRule] failed", error);
    return {
      ok: false,
      message: "We couldn't save this pricing rule right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/** Never touches isActive — see the doc comment on createPricingRule. */
export async function updatePricingRule(
  ruleId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = parsePricingRule(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db.update(pricingRules).set(parsed.data).where(eq(pricingRules.id, ruleId));
  } catch (error) {
    console.error("[updatePricingRule] failed", error);
    return {
      ok: false,
      message: "We couldn't save this pricing rule right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/**
 * The only way "which rule is active" ever changes — a mutually
 * exclusive "radio button," not a per-row boolean toggle. Runs inside
 * one transaction so the database is never observed with zero or
 * multiple active rows in the same market, backed by a real partial
 * unique index (pricing_rules_one_active_per_market) as a database-level
 * guarantee, not just this code path's discipline.
 */
export async function activatePricingRule(
  ruleId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention (via JobActionButton), unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  await requireStaff();

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const rows = await tx.select({ market: pricingRules.market }).from(pricingRules).where(eq(pricingRules.id, ruleId));
      const rule = rows[0];
      if (!rule) throw new Error("Pricing rule not found.");

      await tx
        .update(pricingRules)
        .set({ isActive: false })
        .where(and(eq(pricingRules.market, rule.market), ne(pricingRules.id, ruleId)));
      await tx.update(pricingRules).set({ isActive: true }).where(eq(pricingRules.id, ruleId));
    });
  } catch (error) {
    console.error("[activatePricingRule] failed", error);
    return { ok: false, message: "We couldn't activate this pricing rule right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
