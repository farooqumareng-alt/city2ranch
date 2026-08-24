"use server";

import { getDb } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { contactMessageEmail } from "@/lib/email/templates";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { contactSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

export async function submitContact(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
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
    await db.insert(contactMessages).values(data);
  } catch (error) {
    console.error("[submitContact] database write failed", error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  try {
    const resend = getResend();
    const { subject, html } = contactMessageEmail(data);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitContact] notification email failed", error);
  }

  return { ok: true };
}
