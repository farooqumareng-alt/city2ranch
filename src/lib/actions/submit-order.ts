"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { orderSubmitSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";
import { getCurrentUser } from "@/lib/supabase/server";
import { computePrice } from "@/lib/pricing/compute-price";
import { getActivePricingRule, getZipMileage } from "@/lib/pricing/repository";
import { logAuditEvent } from "@/lib/audit";
import { canPerform, getEffectiveOwner, getEffectiveOwnerWithRole } from "@/lib/household";

const FORM_FIELDS = [
  "storeId",
  "retailerOrderNumber",
  "customerName",
  "customerPhone",
  "pickupNotes",
  "deliveryAddressLine1",
  "deliveryAddressLine2",
  "deliveryCity",
  "deliveryState",
  "deliveryZip",
  "customerNotes",
  "requestedDeliveryDate",
];

export async function submitOrder(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  // The /orders/new page is already sign-in-gated (src/app/orders/layout.tsx),
  // but this action re-verifies itself rather than trusting that gate —
  // same trust model as every other action in this codebase.
  const user = await getCurrentUser();
  if (!user?.email) {
    return { ok: false, message: "Please sign in to submit an order." };
  }

  // The order form already hides itself for a household member whose
  // role can't place orders (see orders/new/page.tsx) — re-checked here
  // regardless, since a household member could otherwise call this
  // action directly and bypass a UI-only gate.
  const { role } = await getEffectiveOwnerWithRole(user.id);
  if (!canPerform(role, "place_order")) {
    return { ok: false, message: "You don't have permission to place orders on this account." };
  }

  const parsed = orderSubmitSchema.safeParse({
    storeId: formData.get("storeId"),
    retailerOrderNumber: formData.get("retailerOrderNumber"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    pickupNotes: formData.get("pickupNotes"),
    deliveryAddressLine1: formData.get("deliveryAddressLine1"),
    deliveryAddressLine2: formData.get("deliveryAddressLine2"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryState: formData.get("deliveryState"),
    deliveryZip: formData.get("deliveryZip"),
    customerNotes: formData.get("customerNotes"),
    requestedDeliveryDate: formData.get("requestedDeliveryDate"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  if (!formServicesConfigured()) {
    return {
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const data = parsed.data;
  let orderId: string;

  try {
    // Mileage is looked up server-side from the ZIP — never accepted as
    // customer input, so a customer can never manipulate the price.
    const roundTripMiles = await getZipMileage(data.deliveryZip);
    if (roundTripMiles == null) {
      // No route data for this ZIP — never invent a price. Point the
      // customer at the waitlist (real lead-capture) rather than a dead
      // end; a concierge follows up once this corridor is configured.
      return {
        ok: false,
        message:
          "Your location requires a custom City2Ranch service quote. Join the waitlist from the Service Area page and a concierge will follow up.",
        fieldErrors: { deliveryZip: "Quote required for this ZIP code." },
        values: valuesFromFormData(formData, FORM_FIELDS),
      };
    }

    const rule = await getActivePricingRule();
    const price = computePrice(rule, roundTripMiles);

    // A household member (see src/lib/household.ts) submits an order
    // that belongs to the owner's account, not a separate one of their
    // own — same effective-owner resolution approve-and-pay.ts uses for
    // its ownership check.
    const owner = await getEffectiveOwner(user.id, user.email);

    const db = getDb();
    const [order] = await db
      .insert(orders)
      .values({
        authUserId: owner.id,
        customerName: data.customerName,
        customerEmail: owner.email,
        customerPhone: data.customerPhone,
        storeId: data.storeId,
        retailerOrderNumber: data.retailerOrderNumber,
        pickupNotes: data.pickupNotes,
        deliveryAddressLine1: data.deliveryAddressLine1,
        deliveryAddressLine2: data.deliveryAddressLine2,
        deliveryCity: data.deliveryCity,
        deliveryState: data.deliveryState,
        deliveryZip: data.deliveryZip,
        customerNotes: data.customerNotes,
        requestedDeliveryDate: data.requestedDeliveryDate,
        serviceType: "pickup",
        status: "priced",
        pricingRuleId: rule.id,
        serviceLabel: rule.serviceLabel,
        roundTripMiles: String(roundTripMiles),
        baseFeeCents: price.baseFeeCents,
        mileageFeeCents: price.mileageFeeCents,
        totalCents: price.totalCents,
      })
      .returning({ id: orders.id });

    orderId = order.id;

    await logAuditEvent({
      orderId,
      actorType: "customer",
      actorId: user.id,
      action: "order_submitted",
      newState: "priced",
      metadata: { totalCents: price.totalCents, roundTripMiles },
    });
  } catch (error) {
    console.error("[submitOrder] failed", error);
    return {
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  redirect(`/orders/${orderId}`);
}
