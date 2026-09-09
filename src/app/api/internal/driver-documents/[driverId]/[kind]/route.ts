import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { driverDocumentKinds, type DriverDocumentKind } from "@/lib/validation/schemas";

const BUCKET = "driver-documents";

/**
 * Redirects to a short-lived signed URL for one of a driver's hiring
 * documents — the bucket is private (see the storage-policy migration),
 * so there's no plain <a href> straight to the file; this is what the
 * Driver Profile page's "View" links point to instead. requireSuperAdmin()
 * here is the real gate (matches the page it's linked from), not the
 * bucket policy alone — same "every action re-verifies itself"
 * discipline as everywhere else in this app.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ driverId: string; kind: string }> }
) {
  await requireSuperAdmin();
  const { driverId, kind } = await params;

  if (!driverDocumentKinds.includes(kind as DriverDocumentKind)) {
    return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  }

  const db = getDb();
  const [driver] = await db
    .select({
      licenseDocPath: drivers.licenseDocPath,
      insuranceDocPath: drivers.insuranceDocPath,
      registrationDocPath: drivers.registrationDocPath,
    })
    .from(drivers)
    .where(eq(drivers.id, driverId));
  if (!driver) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  const path =
    kind === "license"
      ? driver.licenseDocPath
      : kind === "insurance"
        ? driver.insuranceDocPath
        : driver.registrationDocPath;
  if (!path) {
    return NextResponse.json({ error: "No document on file." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  // 60s is only how long the link stays valid, not the whole viewing
  // session — the browser opens it within that window and streams the
  // file itself; Supabase doesn't cut off an already-started download.
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    console.error("[driver-documents route] createSignedUrl failed", error);
    return NextResponse.json({ error: "Couldn't generate a link right now." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
