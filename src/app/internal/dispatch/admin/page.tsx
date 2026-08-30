import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { listStaff, listDrivers, setStaffActive, setDriverActive } from "@/lib/actions/team-management";
import { AddStaffForm } from "@/components/forms/AddStaffForm";
import { AddDriverForm } from "@/components/forms/AddDriverForm";
import { RoleToggleButton } from "@/components/dispatch/RoleToggleButton";
import { ActiveToggleButton } from "@/components/dispatch/ActiveToggleButton";

export const metadata: Metadata = { title: "Admin" };

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  super_admin: "Super Admin",
};

export default async function TeamAdminPage() {
  await requireSuperAdmin();

  const [staffRows, driverRows] = await Promise.all([listStaff(), listDrivers()]);

  return (
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="STAFF"
        title="Admin"
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
                  <p className="font-sans text-sm text-navy-deep">{driver.name}</p>
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
