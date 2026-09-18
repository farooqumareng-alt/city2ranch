import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { listStaff, listDrivers, setDriverActive } from "@/lib/actions/team-management";
import { AddStaffForm } from "@/components/forms/AddStaffForm";
import { AddDriverForm } from "@/components/forms/AddDriverForm";
import { ActiveToggleButton } from "@/components/dispatch/ActiveToggleButton";

export const metadata: Metadata = { title: "Team" };

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  manager: "Manager",
  super_admin: "Super Admin",
};

/**
 * Staff/driver account management — moved here verbatim from the plain
 * /internal/dispatch/admin URL, which Business Overview now occupies
 * (approved UX blueprint, Phase 5's People group). No behavior change,
 * only the URL.
 *
 * Staff row simplified 2026-09-18 (panel redesign) — one plain display
 * row (Name/Email, Role, Status, Last Login) plus a single Edit link,
 * replacing the old inline role-select + two toggle buttons per row;
 * changing Role/Status now happens on a dedicated edit page (mirrors
 * the Pricing/Customer edit-page pattern already used elsewhere), not
 * inline. Drivers below are untouched — not part of this redesign.
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
                    {" · Last login "}
                    {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString() : "never"}
                  </p>
                </div>
                <Button href={`/internal/dispatch/admin/team/${member.id}/edit`} variant="outline-dark" size="md">
                  Edit
                </Button>
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
