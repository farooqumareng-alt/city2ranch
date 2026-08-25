import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/orders");

  return <>{children}</>;
}
