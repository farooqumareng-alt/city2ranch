"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { recurringServicePlanItems, recurringServicePlans } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { canPerform, getEffectiveOwner } from "@/lib/household";
import { getZipMileage } from "@/lib/pricing/repository";
import { recurringServicePlanCreateSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const FORM_FIELDS = [
  "customerName",
  "customerPhone",
  "deliveryAddressLine1",
  "deliveryAddressLine2",
  "deliveryCity",
  "deliveryState",
  "deliveryZip",
  "customerNotes",
  "frequency",
];

/**
 * Every plan plus its items in one query — same leftJoin-and-group-in-JS
 * pattern as getOwnShoppingListsWithItems (src/lib/shopping-lists.ts),
 * for the same reason: N+1 round trips to the pooler add up.
 */
export async function getOwnRecurringServicePlans(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      planId: recurringServicePlans.id,
      status: recurringServicePlans.status,
      frequency: recurringServicePlans.frequency,
      nextRunAt: recurringServicePlans.nextRunAt,
      deliveryAddressLine1: recurringServicePlans.deliveryAddressLine1,
      deliveryCity: recurringServicePlans.deliveryCity,
      deliveryState: recurringServicePlans.deliveryState,
      createdAt: recurringServicePlans.createdAt,
      itemId: recurringServicePlanItems.id,
      itemName: recurringServicePlanItems.itemName,
      itemQuantity: recurringServicePlanItems.quantity,
    })
    .from(recurringServicePlans)
    .leftJoin(recurringServicePlanItems, eq(recurringServicePlanItems.planId, recurringServicePlans.id))
    .where(eq(recurringServicePlans.authUserId, ownerId))
    .orderBy(desc(recurringServicePlans.createdAt), asc(recurringServicePlanItems.sortOrder));

  const plans = new Map<
    string,
    {
      id: string;
      status: string;
      frequency: string;
      nextRunAt: Date;
      deliveryAddressLine1: string;
      deliveryCity: string;
      deliveryState: string;
      items: { itemName: string; quantity: string }[];
    }
  >();
  for (const row of rows) {
    if (!plans.has(row.planId)) {
      plans.set(row.planId, {
        id: row.planId,
        status: row.status,
        frequency: row.frequency,
        nextRunAt: row.nextRunAt,
        deliveryAddressLine1: row.deliveryAddressLine1,
        deliveryCity: row.deliveryCity,
        deliveryState: row.deliveryState,
        items: [],
      });
    }
    if (row.itemId) {
      plans.get(row.planId)!.items.push({ itemName: row.itemName!, quantity: row.itemQuantity! });
    }
  }
  return [...plans.values()];
}

export async function createRecurringServicePlan(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.email) {
    return { ok: false, message: "Please sign in to set up a recurring request." };
  }

  const parsed = recurringServicePlanCreateSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    deliveryAddressLine1: formData.get("deliveryAddressLine1"),
    deliveryAddressLine2: formData.get("deliveryAddressLine2"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryState: formData.get("deliveryState"),
    deliveryZip: formData.get("deliveryZip"),
    customerNotes: formData.get("customerNotes"),
    frequency: formData.get("frequency"),
    itemsJson: formData.get("itemsJson"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const data = parsed.data;

  // Same check submitOrder makes for City Pickup — a plan feeds
  // unattended order creation, so "does this ZIP have route data" must
  // be settled now, not discovered as a silent skip during a cron run.
  const roundTripMiles = await getZipMileage(data.deliveryZip);
  if (roundTripMiles == null) {
    return {
      ok: false,
      message: "Your location requires a custom City2Ranch service quote before a recurring plan can be set up here. Please contact us directly.",
      fieldErrors: { deliveryZip: "No route configured for this ZIP code." },
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const owner = await getEffectiveOwner(user.id, user.email);
  // Setting up a standing request is the same "can this person commit
  // the household to something" gate submit-order.ts uses for a
  // one-off order — a view-only household member shouldn't be able to
  // start a recurring plan on the owner's behalf.
  if (!canPerform(owner.role, "place_order")) {
    return {
      ok: false,
      message: "You don't have permission to set up recurring requests on this account.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(recurringServicePlans)
        .values({
          authUserId: owner.id,
          customerName: data.customerName,
          customerEmail: owner.email,
          customerPhone: data.customerPhone,
          deliveryAddressLine1: data.deliveryAddressLine1,
          deliveryAddressLine2: data.deliveryAddressLine2,
          deliveryCity: data.deliveryCity,
          deliveryState: data.deliveryState,
          deliveryZip: data.deliveryZip,
          customerNotes: data.customerNotes,
          frequency: data.frequency,
          // Starts now — the first cron tick after creation spawns the
          // first order, rather than one being created synchronously
          // here. Keeping order creation solely in the cron route means
          // there's exactly one code path that ever spawns a
          // recurring-plan order, not two slightly different ones.
          nextRunAt: new Date(),
          status: "active",
        })
        .returning({ id: recurringServicePlans.id });

      await tx.insert(recurringServicePlanItems).values(
        data.itemsJson.map((item, index) => ({
          planId: plan.id,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: index,
        }))
      );
    });
  } catch (error) {
    console.error("[createRecurringServicePlan] failed", error);
    return {
      ok: false,
      message: "We couldn't set up this recurring request right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  redirect("/recurring-services");
}

async function setPlanStatus(planId: string, ownerId: string, status: "active" | "paused" | "canceled") {
  const db = getDb();
  await db
    .update(recurringServicePlans)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(recurringServicePlans.id, planId), eq(recurringServicePlans.authUserId, ownerId)));
  revalidatePath("/recurring-services");
}

export async function pauseRecurringServicePlan(planId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;
  const owner = await getEffectiveOwner(user.id, user.email);
  if (!canPerform(owner.role, "place_order")) return;
  await setPlanStatus(planId, owner.id, "paused");
}

/** Resuming re-anchors nextRunAt to now rather than leaving whatever
 *  stale date it had while paused — otherwise a plan paused for a month
 *  would spawn its full backlog of "missed" occurrences the instant it
 *  reactivates (see the cron route's explicit no-catch-up non-goal). */
export async function resumeRecurringServicePlan(planId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;
  const owner = await getEffectiveOwner(user.id, user.email);
  if (!canPerform(owner.role, "place_order")) return;

  const db = getDb();
  await db
    .update(recurringServicePlans)
    .set({ status: "active", nextRunAt: new Date(), updatedAt: new Date() })
    .where(and(eq(recurringServicePlans.id, planId), eq(recurringServicePlans.authUserId, owner.id)));
  revalidatePath("/recurring-services");
}

export async function cancelRecurringServicePlan(planId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;
  const owner = await getEffectiveOwner(user.id, user.email);
  if (!canPerform(owner.role, "place_order")) return;
  await setPlanStatus(planId, owner.id, "canceled");
}
