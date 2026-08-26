"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orderFeeLines, orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { assertTransition } from "@/lib/orders/status";
import { sumFeeLines } from "@/lib/pricing/fee-lines";
import { conciergeQuoteFinalizeSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";
import { logAuditEvent } from "@/lib/audit";
import { getResend } from "@/lib/email/resend";
import { quoteReadyEmail } from "@/lib/email/templates";

/**
 * Replaces a concierge order's fee lines, recomputes totalCents as their
 * sum, and moves the order quote_pending -> priced. This is the one
 * place a Concierge order's price is ever set — there is no automated
 * pricing engine for it.
 */
export async function finalizeConciergeQuote(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const staffUser = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { ok: false, message: "Missing order." };

  const parsed = conciergeQuoteFinalizeSchema.safeParse({
    feeLinesJson: formData.get("feeLinesJson"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const feeLines = parsed.data.feeLinesJson;

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order || order.serviceType !== "concierge") {
    return { ok: false, message: "Concierge order not found." };
  }

  try {
    assertTransition(order.status, "priced");
  } catch {
    return {
      ok: false,
      message: `This order can't be quoted from its current status (${order.status}).`,
    };
  }

  const totalCents = sumFeeLines(feeLines);

  try {
    await db.transaction(async (tx) => {
      await tx.delete(orderFeeLines).where(eq(orderFeeLines.orderId, orderId));
      await tx.insert(orderFeeLines).values(
        feeLines.map((line, index) => ({
          orderId,
          label: line.label,
          amountCents: line.amountCents,
          sortOrder: index,
        }))
      );
      await tx
        .update(orders)
        .set({ status: "priced", totalCents, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });

    await logAuditEvent({
      orderId,
      actorType: "staff",
      actorId: staffUser?.id ?? null,
      action: "quote_finalized",
      previousState: order.status,
      newState: "priced",
      metadata: { totalCents, lineCount: feeLines.length },
    });

    // Non-blocking: an unclaimed order (no authUserId yet — see
    // claim-order.ts) needs to tell the customer their quote is ready,
    // since nothing else would prompt them to sign in and look. Failure
    // here never blocks the quote from being finalized.
    if (!order.authUserId) {
      try {
        const resend = getResend();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const { subject, html } = quoteReadyEmail({
          totalCents,
          signInUrl: `${siteUrl}/sign-in?next=/orders`,
        });
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "notifications@city2ranch.com",
          to: order.customerEmail,
          subject,
          html,
        });
      } catch (error) {
        console.error("[finalizeConciergeQuote] quote-ready email failed", error);
      }
    }
  } catch (error) {
    console.error("[finalizeConciergeQuote] failed", error);
    return {
      ok: false,
      message: "We couldn't save the quote right now. Please try again shortly.",
    };
  }

  revalidatePath(`/internal/dispatch/concierge/${orderId}`);
  revalidatePath("/internal/dispatch/concierge");
  return { ok: true };
}

/** Staff reopening an already-priced quote to fix a mistake before the
 *  customer has started checkout — the priced -> quote_pending edge. */
export async function reopenConciergeQuote(orderId: string) {
  await requireStaff();
  const staffUser = await getCurrentUser();

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order || order.serviceType !== "concierge") return;

  try {
    assertTransition(order.status, "quote_pending");
  } catch {
    return;
  }

  await db
    .update(orders)
    .set({ status: "quote_pending", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: staffUser?.id ?? null,
    action: "quote_reopened",
    previousState: order.status,
    newState: "quote_pending",
  });

  revalidatePath(`/internal/dispatch/concierge/${orderId}`);
}
