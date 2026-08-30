import { NextRequest, NextResponse } from "next/server";
import { getServiceZoneStatus } from "@/lib/pricing/service-zone";
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

  const { status } = await getServiceZoneStatus(parsed.data.zip);

  return NextResponse.json({
    zip: parsed.data.zip,
    status,
  });
}
