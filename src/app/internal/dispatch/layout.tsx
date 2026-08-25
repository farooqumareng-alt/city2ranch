import { requireStaff } from "@/lib/auth/roles";

export default async function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  return <>{children}</>;
}
