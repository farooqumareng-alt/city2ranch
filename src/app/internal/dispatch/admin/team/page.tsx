import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { listStaff, listDrivers, setStaffActive, setDriverActive } from "@/lib/actions/team-management";
import { AddStaffForm } from "@/components/forms/AddStaffForm";
import { AddDriverForm } from "@/components/forms/AddDriverForm";
import { RoleToggleButton } from "@/components/dispatch/RoleToggleButton";
import { ActiveToggleButton } from "@/components/dispatch/ActiveToggleButton";

export const metadata: Metadata = { title: "Team" };

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  super_admin: "Super Admin",
};

/**
 * Staff/driver account management — moved here verbatim from the plain
 * /internal/dispatch/admin URL, which Business Overview now occupies
 * (approved UX blueprint, Phase 5's People group). No behavior change,
 * only the URL.
 */
export default async function TeamAdminPage() {
  await requireSuperAdmin();

  const [staffRows, driverRows] = await Promise.all([listStaff(), listDrivers()]);

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="STAFF"
        title="Team"
        description="Manage who has staff and driver access to City2Ranch."
      />

      <section className="flex flex-col gap-6">
        <h3 className="font-serif text-lg text-navy-deep">Staff</h3>
        {staffRows.length === 0 ? (
          <EmptyState message="No staff members yet." />
        ) : (
          <RowList>
            {staffRows.map((member) => (
              <Row key={member.id}>
                <div>
                  <p className="font-sans text-sm text-navy-deep">{member.email ?? "(no email on file)"}</p>
                  <p className="font-sans text-xs text-charcoal/60">
                    {member.label ? `${member.label} · ` : ""}
                    {ROLE_LABELS[member.role] ?? member.role}
                    {!member.isActive ? " · Disabled" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <RoleToggleButton staffId={member.id} currentRole={member.role} />
                  <ActiveToggleButton
                    action={setStaffActive.bind(null, member.id)}
                    isActive={member.isActive}
                  />
                </div>
              </Row>
            ))}
          </RowList>
        )}
        <AddStaffForm />
      </section>

      <section className="flex flex-col gap-6">
        <h3 className="font-serif text-lg text-navy-deep">Drivers</h3>
        {driverRows.length === 0 ? (
          <EmptyState message="No drivers yet." />
        ) : (
          <RowList>
            {driverRows.map((driver) => (
              <Row key={driver.id}>
                <div>
                  {/* Just the name links, not the whole row via Row's own
                      href prop — this row also has ActiveToggleButton's
                      <form> in it, and nesting a form inside an anchor
                      is invalid HTML. */}
                  <Link
                    href={`/internal/dispatch/admin/drivers/${driver.id}`}
                    className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                  >
                    {driver.name}
                  </Link>
                  <p className="font-sans text-xs text-charcoal/60">
                    {driver.email ?? "(no email on file)"}
                    {driver.phone ? ` · ${driver.phone}` : ""}
                    {!driver.isActive ? " · Disabled" : ""}
                  </p>
                </div>
                <ActiveToggleButton
                  action={setDriverActive.bind(null, driver.id)}
                  isActive={driver.isActive}
                />
              </Row>
            ))}
          </RowList>
        )}
        <AddDriverForm />
      </section>
    </div>
  );
}
