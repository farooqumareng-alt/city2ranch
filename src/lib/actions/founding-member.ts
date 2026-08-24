"use server";

import { getDb } from "@/lib/db";
import { foundingMembers } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { foundingMemberEmail } from "@/lib/email/templates";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { foundingMemberSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

export async function submitFoundingMember(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = foundingMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    zip: formData.get("zip"),
    propertyLocation: formData.get("propertyLocation"),
    preferredStores: formData.get("preferredStores"),
    shoppingFrequency: formData.get("shoppingFrequency"),
    servicesNeeded: formData.get("servicesNeeded"),
    preferredDays: formData.get("preferredDays"),
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

  try {
    const db = getDb();
    await db.insert(foundingMembers).values(data);
  } catch (error) {
    console.error("[submitFoundingMember] database write failed", error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  try {
    const resend = getResend();
    const { subject, html } = foundingMemberEmail(data);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitFoundingMember] notification email failed", error);
  }

  return { ok: true };
}
