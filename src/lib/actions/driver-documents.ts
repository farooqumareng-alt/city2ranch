"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { driverDocumentKinds, type DriverDocumentKind } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/actions/types";

const BUCKET = "driver-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a phone photo or scanned PDF.
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

/**
 * Uploads one hiring document (license/insurance/registration scan) to
 * the private "driver-documents" Storage bucket and records its path on
 * the driver row — bound as `uploadDriverDocument.bind(null, driverId,
 * kind)`. Path is fixed per kind ("<driverId>/<kind>", no extension —
 * Content-Type is carried as object metadata instead, so it never needs
 * parsing back out of the path), with upsert:true so re-uploading
 * replaces the old file rather than accumulating orphans.
 *
 * Uses the ordinary per-request Supabase server client, not the
 * service-role admin client — the storage-policy migration already
 * grants any active staff member access to this bucket, so no elevated
 * privilege is needed here, unlike inviting a driver
 * (team-management.ts's inviteDriver).
 */
export async function uploadDriverDocument(
  driverId: string,
  kind: DriverDocumentKind,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  if (!driverDocumentKinds.includes(kind)) {
    return { ok: false, message: "Unknown document type." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is too large — the limit is 10MB." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Upload a PDF, JPG, or PNG file." };
  }

  const path = `${driverId}/${kind}`;
  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    console.error("[uploadDriverDocument] upload failed", uploadError);
    return { ok: false, message: "We couldn't upload that file right now. Please try again shortly." };
  }

  const db = getDb();
  const columnUpdate =
    kind === "license"
      ? { licenseDocPath: path }
      : kind === "insurance"
        ? { insuranceDocPath: path }
        : { registrationDocPath: path };

  try {
    await db.update(drivers).set(columnUpdate).where(eq(drivers.id, driverId));
  } catch (error) {
    console.error("[uploadDriverDocument] db update failed", error);
    return { ok: false, message: "The file uploaded, but we couldn't save it to this driver. Please try again." };
  }

  revalidatePath(`/internal/dispatch/admin/drivers/${driverId}`);
  return { ok: true };
}
