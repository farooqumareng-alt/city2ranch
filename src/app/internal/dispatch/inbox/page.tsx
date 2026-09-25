import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InboxList } from "@/components/dispatch/InboxList";
import { listInboxEntries } from "@/lib/actions/inbox";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Every guest signup/message outside the real order pipeline — see the
 * doc comment on listInboxEntries() for why this exists and why it's
 * called "Inbox", not "Leads". Tab filtering (Inbox/Likely Spam/All)
 * moved into InboxList.tsx (2026-09-25) alongside the looksLikeSpam()
 * heuristic — see that component's own doc comment.
 */
export default async function InboxPage() {
  await requireStaff();
  const entries = await listInboxEntries();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="STAFF"
        title="Inbox"
        description="Service Area waitlist signups, Founding Member applications, and Contact/Support messages — everything that comes in before it's a real order."
      />
      <InboxList entries={entries} />
    </div>
  );
}
