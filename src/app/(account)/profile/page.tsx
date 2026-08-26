import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/actions/update-profile";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Your City2Ranch contact info and default delivery address.",
};

export default async function ProfilePage() {
  // ProfileLayout already redirects a signed-out visitor, but this page
  // still needs the real user id itself — never trust a shared "you're
  // allowed here" check to also mean "here's who you are."
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getOwnProfile(user.id);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="My Profile"
        description={`Signed in as ${user.email}.`}
      />
      <div className="max-w-2xl">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
