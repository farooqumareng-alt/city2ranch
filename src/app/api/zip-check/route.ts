import { NextRequest, NextResponse } from "next/server";
import { isZipServed } from "@/lib/zip-coverage";
import { zipCheckSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip") ?? "";

  const parsed = zipCheckSchema.safeParse({ zip });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid 5-digit ZIP code." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    zip: parsed.data.zip,
    available: isZipServed(parsed.data.zip),
  });
}
