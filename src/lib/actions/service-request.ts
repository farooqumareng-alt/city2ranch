"use server";

import { getDb } from "@/lib/db";
import { serviceRequests } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { serviceRequestEmail, requestReceivedEmail } from "@/lib/email/templates";
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
  "referralSource",
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
    referralSource: formData.get("referralSource"),
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
  let requestId: string;

  try {
    const db = getDb();
    // .returning() added 2026-09-01 (lifecycle audit issues #2/#3) — the
    // insert used to discard the new row's id entirely, so neither the
    // admin notification nor a customer confirmation had anything to
    // link back to.
    const [row] = await db.insert(serviceRequests).values(data).returning({ id: serviceRequests.id });
    requestId = row.id;
  } catch (error) {
    console.error("[submitServiceRequest] database write failed", error);
    return {
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const resend = getResend();
    const { subject, html } = serviceRequestEmail({ ...data, id: requestId });
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitServiceRequest] notification email failed", error);
  }

  // Customer-facing confirmation — this used to not exist at all
  // (lifecycle audit issue #2). Best-effort, like every other email
  // send in this codebase: never blocks the request itself from
  // succeeding.
  try {
    const resend = getResend();
    const { subject, html } = requestReceivedEmail({
      serviceType: data.serviceType,
      shoppingList: data.shoppingList,
      signInUrl: `${siteUrl}/sign-in?next=/my-services`,
    });
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: data.email,
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitServiceRequest] customer confirmation email failed", error);
  }

  return { ok: true };
}
