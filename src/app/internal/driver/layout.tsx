import { requireDriver } from "@/lib/auth/roles";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDriver();
  return <>{children}</>;
}
