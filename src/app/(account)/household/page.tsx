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
  updateHouseholdMemberRole,
} from "@/lib/actions/household";
import { SelectField } from "@/components/ui/FormField";
import { HOUSEHOLD_ROLE_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Household",
  description: "Give someone access to your City2Ranch account.",
};

const MEMBER_STATUS_LABELS: Record<string, string> = {
  invited: "Invite sent — awaiting acceptance",
  active: "Active",
};

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  HOUSEHOLD_ROLE_OPTIONS.map((o) => [o.value, o.label])
);

export default async function HouseholdPage() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { ownedMembers, pendingInvites, activeMembership } = await getHouseholdData(user.id, user.email);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Household"
        description="Give someone you trust access to your requests, orders, and places — full access, ordering-only, or view-only."
      />

      {pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-4">
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-gold/40 bg-gold/10 p-6"
            >
              <p className="font-sans text-sm text-navy-deep">
                <strong>{invite.ownerEmail ?? "Someone"}</strong> has invited you to their City2Ranch account:{" "}
                <strong>{ROLE_LABELS[invite.role] ?? invite.role}</strong>.
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
            You have access to <strong>{activeMembership.ownerEmail ?? "another account"}</strong>&apos;s City2Ranch
            account: <strong>{ROLE_LABELS[activeMembership.role] ?? activeMembership.role}</strong>. Their requests,
            orders, and places show up on your account too.
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
              They&apos;ll get an email to sign in and accept. Choose how much access they get — you can change
              it any time.
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
                        {MEMBER_STATUS_LABELS[member.status] ?? member.status} · {ROLE_LABELS[member.role] ?? member.role}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <form action={updateHouseholdMemberRole.bind(null, member.id)}>
                        <SelectField
                          name="role"
                          label="Access"
                          defaultValue={member.role}
                          options={HOUSEHOLD_ROLE_OPTIONS}
                        />
                        <button type="submit" className="mt-1.5 font-sans text-xs text-navy-deep underline">
                          Update
                        </button>
                      </form>
                      <form action={revokeHouseholdMember.bind(null, member.id)}>
                        <Button type="submit" variant="outline-dark" size="md">
                          Remove
                        </Button>
                      </form>
                    </div>
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
