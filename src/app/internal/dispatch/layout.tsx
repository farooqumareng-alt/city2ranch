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

  // App canvas (UI modernization Phase 1, 2026-11-04): signed-in
  // panels sit on the light-gray app background, public pages keep
  // the ivory brand canvas. h-full so the band fills the <main> area
  // between the site header and footer.
  return (
    <div className="h-full bg-app-bg">
      <Container className="flex flex-col gap-8 py-10 sm:py-12 md:flex-row md:items-start md:gap-8">
        <StaffSidebar
          userEmail={staffMember.email}
          isSuperAdmin={staffMember.role === "super_admin"}
          canConfigureBusiness={canPerform(staffMember.role, "configure_business")}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </Container>
    </div>
  );
}
