import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwner } from "@/lib/household";
import { getOwnProfile } from "@/lib/actions/update-profile";

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
  const pathname = (await headers()).get("x-pathname") ?? "/home";

  if (!user?.email) {
    redirect(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  // A household member (see src/lib/household.ts) sees whose account
  // they're actually managing, since it isn't their own — and their own
  // role there, since "managing" doesn't imply full access anymore.
  const owner = await getEffectiveOwner(user.id, user.email);
  const isDelegated = owner.id !== user.id;
  const managingEmail = isDelegated ? owner.email : undefined;
  const managingRole = isDelegated && owner.role !== "full" ? owner.role : undefined;
  const profile = await getOwnProfile(owner.id);

  return (
    <Container className="flex flex-col gap-8 py-12 sm:py-16 md:flex-row md:items-start md:gap-10">
      <AccountSidebar
        pathname={pathname}
        userEmail={user.email}
        userName={profile?.name ?? undefined}
        managingEmail={managingEmail}
        managingRole={managingRole}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}
