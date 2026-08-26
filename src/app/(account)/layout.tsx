import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Shared sign-in gate + sidebar shell for every account page (/orders,
 * /orders/new, /orders/[id], /profile) — a route group, so it doesn't
 * add a URL segment. Consolidates what used to be two nearly-identical
 * layout.tsx files (orders/layout.tsx, profile/layout.tsx), each
 * re-implementing the same redirect logic.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const pathname = (await headers()).get("x-pathname") ?? "/orders";

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  return (
    <Container className="flex flex-col gap-8 py-12 sm:py-16 md:flex-row md:items-start md:gap-10">
      <AccountSidebar pathname={pathname} />
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}
