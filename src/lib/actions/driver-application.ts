"use server";

import { getDb } from "@/lib/db";
import { driverApplications } from "@/lib/db/schema";
import { getResend } from "@/lib/email/resend";
import { driverApplicationEmail } from "@/lib/email/templates";
import { formServicesConfigured, SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/env";
import { driverApplicationSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

/**
 * Public driver application (/drive) — same structure as
 * submitFoundingMember (founding-member.ts): parse, check the degraded-
 * dependency gate, insert, then a best-effort notify email that never
 * blocks the submission itself. Staff review the application from the
 * Inbox (listInboxEntries(), inbox.ts); approving it calls
 * approveDriverApplication (team-management.ts), which creates the real
 * drivers row.
 */
export async function submitDriverApplication(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = driverApplicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    zip: formData.get("zip"),
    vehicle: formData.get("vehicle"),
    hasLicenseAndInsurance: formData.get("hasLicenseAndInsurance"),
    availability: formData.get("availability"),
    motivation: formData.get("motivation"),
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
    await db.insert(driverApplications).values(data);
  } catch (error) {
    console.error("[submitDriverApplication] database write failed", error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  try {
    const resend = getResend();
    const { subject, html } = driverApplicationEmail(data);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
      to: process.env.CONCIERGE_NOTIFY_EMAIL ?? "",
      subject,
      html,
    });
  } catch (error) {
    console.error("[submitDriverApplication] notification email failed", error);
  }

  return { ok: true };
}
