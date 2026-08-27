import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOwnSupportMessages } from "@/lib/support";

export const metadata: Metadata = {
  title: "Support",
  description: "Your past messages to City2Ranch.",
};

const SUPPORT_STATUS_LABELS: Record<string, string> = {
  new: "Received",
  contacted: "We're following up",
  converted: "Resolved",
  closed: "Resolved",
};

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const messages = await getOwnSupportMessages(user.email);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="Support"
          description="Need help? Reach your concierge directly."
        />
        <Button href="/contact" variant="navy">
          New Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          You haven&apos;t contacted us yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="font-serif text-lg text-navy-deep">Your Messages</h3>
          <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-serif text-base text-navy-deep">{msg.subject}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-sans text-sm text-charcoal/70">
                  {SUPPORT_STATUS_LABELS[msg.status] ?? msg.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
