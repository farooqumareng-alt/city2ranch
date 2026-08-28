import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NotificationPreferencesForm } from "@/components/forms/NotificationPreferencesForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { getOwnNotificationPreferences } from "@/lib/actions/notification-preferences";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Choose which emails City2Ranch sends you.",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  // A household member (see src/lib/household.ts) sets the owner's
  // shared preferences, not a separate set of their own.
  const ownerId = await getEffectiveOwnerId(user.id);

  const prefs = await getOwnNotificationPreferences(ownerId);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Notifications"
        description="Choose which emails City2Ranch sends you. More categories will show up here as more of the account can actually notify you about them."
      />
      <div className="max-w-md">
        <NotificationPreferencesForm paymentReceipts={prefs.paymentReceipts} />
      </div>
    </div>
  );
}
