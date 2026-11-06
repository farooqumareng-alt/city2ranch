import { Container } from "@/components/ui/Container";
import { DriverSidebar } from "@/components/driver/DriverSidebar";
import { requireDriver } from "@/lib/auth/roles";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const driver = await requireDriver();

  // App canvas — see dispatch/layout.tsx (UI modernization Phase 1).
  return (
    <div className="h-full bg-app-bg">
      <Container className="flex flex-col gap-8 py-10 sm:py-12 md:flex-row md:items-start md:gap-8">
        <DriverSidebar userEmail={driver.email} userName={driver.name} />
        <div className="min-w-0 flex-1">{children}</div>
      </Container>
    </div>
  );
}
