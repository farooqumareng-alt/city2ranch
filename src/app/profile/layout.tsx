import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const pathname = (await headers()).get("x-pathname") ?? "/profile";
    redirect(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  return <>{children}</>;
}
