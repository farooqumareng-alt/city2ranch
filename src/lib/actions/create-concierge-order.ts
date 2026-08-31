"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { orderItems, orders, serviceRequests } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { getZipMileage } from "@/lib/pricing/repository";
import { conciergeOrderCreateSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";
import { logAuditEvent } from "@/lib/audit";

/** Thrown inside the transaction above purely to trigger a rollback and
 *  a specific message when a service request was already converted —
 *  see the comment at that check for why this exists alongside the
 *  real database-level guard. */
class ServiceRequestAlreadyConvertedError extends Error {}

// itemsJson deliberately excluded — it's re-serialized client-side from
// NewConciergeOrderForm's own `items` state, which a failed submission
// never clears (only the flat fields below need round-tripping here).
const FORM_FIELDS = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "deliveryAddressLine1",
  "deliveryAddressLine2",
  "deliveryCity",
  "deliveryState",
  "deliveryZip",
  "customerNotes",
  "requestedDeliveryDate",
];

/**
 * Staff-side concierge order creation. Unlike submitOrder (City Pickup),
 * there's no price computed here — the order starts at "quote_pending"
 * and staff builds the actual quote afterward via
 * finalizeConciergeQuote. authUserId is deliberately left unset (see
 * claim-order.ts) — the customer this order is for may not have signed
 * in yet, since /request-service (the usual source) is guest-open.
 */
export async function createConciergeOrder(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const staffUser = await getCurrentUser();

  const serviceRequestId = String(formData.get("serviceRequestId") ?? "").trim() || null;

  const parsed = conciergeOrderCreateSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    deliveryAddressLine1: formData.get("deliveryAddressLine1"),
    deliveryAddressLine2: formData.get("deliveryAddressLine2"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryState: formData.get("deliveryState"),
    deliveryZip: formData.get("deliveryZip"),
    customerNotes: formData.get("customerNotes"),
    requestedDeliveryDate: formData.get("requestedDeliveryDate"),
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
  const items = data.itemsJson; // parsed array — see schema for why the key stays "itemsJson"
  let orderId: string;

  try {
    // orders.deliveryZip has a real FK to zip_mileage.zip (same
    // constraint City Pickup already lives under) — check first so a
    // missing ZIP is a clear field error, not a raw FK-violation 500.
    const hasRoute = (await getZipMileage(data.deliveryZip)) != null;
    if (!hasRoute) {
      return {
        ok: false,
        message:
          "This ZIP code has no route data yet. Add it to zip_mileage before creating an order for this address.",
        fieldErrors: { deliveryZip: "No route configured for this ZIP." },
        values: valuesFromFormData(formData, FORM_FIELDS),
      };
    }

    const db = getDb();
    orderId = await db.transaction(async (tx) => {
      // A double-submit of this form (e.g. a slow connection triggering
      // a retry) used to be able to convert one service request into
      // two independently-payable concierge orders. Checked inside the
      // transaction, and backed by a real partial unique index on
      // orders.service_request_id as the actual race-proof guard — this
      // check is just what turns that constraint violation into a clear
      // message instead of the generic catch-all below.
      if (serviceRequestId) {
        const existing = await tx
          .select({ status: serviceRequests.status })
          .from(serviceRequests)
          .where(eq(serviceRequests.id, serviceRequestId));
        if (existing[0]?.status === "converted") {
          throw new ServiceRequestAlreadyConvertedError();
        }
      }

      const [order] = await tx
        .insert(orders)
        .values({
          serviceType: "concierge",
          serviceRequestId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          deliveryAddressLine1: data.deliveryAddressLine1,
          deliveryAddressLine2: data.deliveryAddressLine2,
          deliveryCity: data.deliveryCity,
          deliveryState: data.deliveryState,
          deliveryZip: data.deliveryZip,
          customerNotes: data.customerNotes,
          requestedDeliveryDate: data.requestedDeliveryDate,
          status: "quote_pending",
          serviceLabel: "City2Ranch Concierge Shopping & Delivery",
          totalCents: 0,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        items.map((item, index) => ({
          orderId: order.id,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: index,
        }))
      );

      if (serviceRequestId) {
        await tx
          .update(serviceRequests)
          .set({ status: "converted" })
          .where(eq(serviceRequests.id, serviceRequestId));
      }

      return order.id;
    });

    await logAuditEvent({
      orderId,
      actorType: "staff",
      actorId: staffUser?.id ?? null,
      action: "concierge_order_created",
      newState: "quote_pending",
      metadata: { itemCount: items.length, serviceRequestId },
    });
  } catch (error) {
    if (error instanceof ServiceRequestAlreadyConvertedError) {
      return {
        ok: false,
        message: "This service request has already been converted into an order.",
        values: valuesFromFormData(formData, FORM_FIELDS),
      };
    }
    console.error("[createConciergeOrder] failed", error);
    return {
      ok: false,
      message: "We couldn't create the order right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  redirect(`/internal/dispatch/orders/${orderId}`);
}
