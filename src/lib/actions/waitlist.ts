"use server";

import { getDb } from "@/lib/db";
import { serviceAreaLeads } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { waitlistLeadEmail } from "@/lib/email/templates";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { waitlistSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

export async function submitWaitlist(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = waitlistSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    preferredFrequency: formData.get("preferredFrequency"),
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
    await db.insert(serviceAreaLeads).values(data);
  } catch (error) {
    console.error("[submitWaitlist] database write failed", error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  try {
    const resend = getResend();
    const { subject, html } = waitlistLeadEmail(data);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    // Lead is already captured in the database; the email is a
    // convenience notification, so a failure here doesn't fail the
    // customer's submission — just log it for manual follow-up.
    console.error("[submitWaitlist] notification email failed", error);
  }

  return { ok: true };
}
