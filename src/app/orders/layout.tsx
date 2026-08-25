import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    // x-pathname is set by src/proxy.ts on every request — sends the
    // visitor back to exactly the page they wanted (e.g. /orders/new
    // from the homepage CTA) instead of always the generic /orders list.
    const pathname = (await headers()).get("x-pathname") ?? "/orders";
    redirect(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  return <>{children}</>;
}
