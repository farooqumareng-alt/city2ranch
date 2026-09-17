import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { InboxStatusSelect } from "@/components/dispatch/InboxStatusSelect";
import { listInboxEntries } from "@/lib/actions/inbox";
import { SOURCE_LABELS } from "@/lib/inbox-types";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Every guest signup/message outside the real order pipeline — see the
 * doc comment on listInboxEntries() for why this exists and why it's
 * called "Inbox", not "Leads".
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

      {entries.length === 0 ? (
        <EmptyState message="Nothing here yet." />
      ) : (
        <RowList>
          {entries.map((entry) => (
            <Row key={`${entry.source}-${entry.id}`}>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide text-navy-deep">
                    {SOURCE_LABELS[entry.source]}
                  </span>
                  <p className="font-sans text-sm font-medium text-navy-deep">{entry.name}</p>
                </div>
                <p className="font-sans text-xs text-charcoal/70">
                  {entry.email}
                  {entry.phone ? ` · ${entry.phone}` : ""}
                </p>
                <p className="font-sans text-xs text-charcoal/60">{entry.context}</p>
                {entry.message ? (
                  <p className="max-w-xl whitespace-pre-wrap font-sans text-xs text-charcoal/70">{entry.message}</p>
                ) : null}
                <p className="font-sans text-[11px] text-charcoal/40">{entry.createdAt.toLocaleString()}</p>
              </div>
              <InboxStatusSelect source={entry.source} id={entry.id} currentStatus={entry.status} />
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
