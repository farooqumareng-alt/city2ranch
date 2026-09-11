import { Container } from "@/components/ui/Container";
import { StaffSidebar } from "@/components/dispatch/StaffSidebar";
import { requireStaff } from "@/lib/auth/roles";
import { canPerform } from "@/lib/staff-roles";

export default async function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staffMember = await requireStaff();

  return (
    <Container className="flex flex-col gap-8 py-12 sm:py-16 md:flex-row md:items-start md:gap-10">
      <StaffSidebar
        userEmail={staffMember.email}
        isSuperAdmin={staffMember.role === "super_admin"}
        canConfigureBusiness={canPerform(staffMember.role, "configure_business")}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}
