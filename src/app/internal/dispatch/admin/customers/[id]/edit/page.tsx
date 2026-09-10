import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EditCustomerForm } from "@/components/forms/EditCustomerForm";
import { getCustomerProfileForEdit, updateCustomerProfileAsAdmin } from "@/lib/actions/customer-detail";
import { requireSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const profile = await getCustomerProfileForEdit(id);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Edit Customer"
        description="Every change here is logged, including who made it."
      />
      <div className="max-w-2xl">
        <EditCustomerForm action={updateCustomerProfileAsAdmin.bind(null, id)} profile={profile} />
      </div>
    </div>
  );
}
