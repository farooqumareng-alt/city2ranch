"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { orderSubmitSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";
import { getCurrentUser } from "@/lib/supabase/server";
import { computePrice } from "@/lib/pricing/compute-price";
import { getActivePricingRule, getZipMileage } from "@/lib/pricing/repository";
import { logAuditEvent } from "@/lib/audit";

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
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  if (!formServicesConfigured()) {
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
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
      };
    }

    const rule = await getActivePricingRule();
    const price = computePrice(rule, roundTripMiles);

    const db = getDb();
    const [order] = await db
      .insert(orders)
      .values({
        authUserId: user.id,
        customerName: data.customerName,
        customerEmail: user.email,
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
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  redirect(`/orders/${orderId}`);
}
