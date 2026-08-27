import { headers } from "next/headers";
import { Container } from "@/components/ui/Container";
import { DriverSidebar } from "@/components/driver/DriverSidebar";
import { requireDriver } from "@/lib/auth/roles";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const driver = await requireDriver();
  const pathname = (await headers()).get("x-pathname") ?? "/internal/driver";

  return (
    <Container className="flex flex-col gap-8 py-12 sm:py-16 md:flex-row md:items-start md:gap-10">
      <DriverSidebar pathname={pathname} userEmail={driver.email} />
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}
