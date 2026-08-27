"use server";

import { getDb } from "@/lib/db";
import { serviceRequests } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { serviceRequestEmail } from "@/lib/email/templates";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { serviceRequestSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const FORM_FIELDS = [
  "name",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zip",
  "serviceType",
  "preferredStore",
  "shoppingList",
  "estimatedOrderValue",
  "timingPreference",
  "requestedDeliveryDate",
  "notes",
];

export async function submitServiceRequest(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = serviceRequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    serviceType: formData.get("serviceType"),
    preferredStore: formData.get("preferredStore"),
    shoppingList: formData.get("shoppingList"),
    estimatedOrderValue: formData.get("estimatedOrderValue"),
    timingPreference: formData.get("timingPreference"),
    requestedDeliveryDate: formData.get("requestedDeliveryDate"),
    notes: formData.get("notes"),
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

  try {
    const db = getDb();
    await db.insert(serviceRequests).values(data);
  } catch (error) {
    console.error("[submitServiceRequest] database write failed", error);
    return {
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const resend = getResend();
    const { subject, html } = serviceRequestEmail(data);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitServiceRequest] notification email failed", error);
  }

  return { ok: true };
}
