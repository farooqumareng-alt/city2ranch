import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EditStaffAccountForm } from "@/components/forms/EditStaffAccountForm";
import { updateStaffAccount } from "@/lib/actions/team-management";
import { getDb } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Staff Account" };

/**
 * One page, one job (2026-09-18, panel redesign) — Role and Status,
 * changed together and saved together, replacing the Team page's old
 * inline role-select + two toggle buttons per row. Email is
 * deliberately not editable here — it's the account's login identity,
 * same "excluded from edit, that's login identity" call
 * updateCustomerProfileAsAdmin made for a customer's own email.
 */
export default async function EditStaffAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const db = getDb();
  const rows = await db
    .select({
      id: staff.id,
      label: staff.label,
      role: staff.role,
      isActive: staff.isActive,
    })
    .from(staff)
    .where(eq(staff.id, id));
  const member = rows[0];
  if (!member) notFound();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title={`Edit ${member.label ?? "Staff Account"}`}
        description="Change this account's role or access."
      />
      <div className="max-w-md">
        <EditStaffAccountForm
          action={updateStaffAccount.bind(null, member.id)}
          currentRole={member.role}
          isActive={member.isActive}
        />
      </div>
    </div>
  );
}
