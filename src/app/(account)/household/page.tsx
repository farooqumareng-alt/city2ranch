import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { InviteHouseholdMemberForm } from "@/components/forms/InviteHouseholdMemberForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { getHouseholdData } from "@/lib/household";
import {
  acceptHouseholdInvite,
  declineHouseholdInvite,
  revokeHouseholdMember,
  leaveHousehold,
} from "@/lib/actions/household";

export const metadata: Metadata = {
  title: "Household",
  description: "Give someone full access to your City2Ranch account.",
};

const MEMBER_STATUS_LABELS: Record<string, string> = {
  invited: "Invite sent — awaiting acceptance",
  active: "Full access",
};

export default async function HouseholdPage() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { ownedMembers, pendingInvites, activeMembership } = await getHouseholdData(user.id, user.email);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Household"
        description="Give someone you trust full access to your requests, orders, and places — as if they were you, including approving payment."
      />

      {pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-gold/40 bg-gold/10 p-6"
            >
              <p className="font-sans text-sm text-navy-deep">
                <strong>{invite.ownerEmail ?? "Someone"}</strong> has invited you to full access on their
                City2Ranch account.
              </p>
              <div className="flex gap-3">
                <form action={acceptHouseholdInvite.bind(null, invite.id)}>
                  <Button type="submit" variant="navy" size="md">
                    Accept
                  </Button>
                </form>
                <form action={declineHouseholdInvite.bind(null, invite.id)}>
                  <Button type="submit" variant="outline-dark" size="md">
                    Decline
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeMembership ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-navy/10 bg-white/60 p-6">
          <p className="font-sans text-sm text-navy-deep">
            You have full access to <strong>{activeMembership.ownerEmail ?? "another account"}</strong>&apos;s
            City2Ranch account. Their requests, orders, and places show up on your account too.
          </p>
          <form action={leaveHousehold.bind(null, activeMembership.id)}>
            <Button type="submit" variant="outline-dark" size="md">
              Leave
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="font-serif text-lg text-navy-deep">Invite Someone</h3>
            <p className="font-sans text-sm text-charcoal/70">
              They&apos;ll get an email to sign in and accept. Once accepted, they can request service, view
              orders, and pay on your behalf.
            </p>
          </div>
          <InviteHouseholdMemberForm />

          {ownedMembers.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-serif text-lg text-navy-deep">People With Access</h3>
              <div className="flex flex-col divide-y divide-navy/10 border-y border-navy/10">
                {ownedMembers.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-sans text-sm text-navy-deep">{member.memberEmail}</p>
                      <p className="font-sans text-xs text-charcoal/60">
                        {MEMBER_STATUS_LABELS[member.status] ?? member.status}
                      </p>
                    </div>
                    <form action={revokeHouseholdMember.bind(null, member.id)}>
                      <Button type="submit" variant="outline-dark" size="md">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
