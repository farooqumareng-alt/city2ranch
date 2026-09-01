import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { ActiveToggleButton } from "@/components/dispatch/ActiveToggleButton";
import { listStores, setStoreActive } from "@/lib/actions/store-management";
import { requireStaff } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage() {
  // Re-checked here, not just relied on via listStores()'s own gate or
  // DispatchLayout — every page in this app re-verifies its own
  // authorization independently.
  await requireStaff();
  const storeRows = await listStores();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="BUSINESS"
          title="Stores"
          description="Pickup locations customers can choose from when placing a City Pickup order."
        />
        <Button href="/internal/dispatch/stores/new" variant="navy">
          Add Store
        </Button>
      </div>

      {storeRows.length === 0 ? (
        <EmptyState message="No stores yet." />
      ) : (
        <RowList>
          {storeRows.map((store) => (
            <Row key={store.id}>
              {/* Just the name links, not the whole row — this row also
                  has ActiveToggleButton's <form> in it, and nesting a
                  form inside an anchor is invalid HTML (same reasoning
                  as admin/page.tsx's driver rows). */}
              <div>
                <Link
                  href={`/internal/dispatch/stores/${store.id}`}
                  className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                >
                  {store.name}
                </Link>
                <p className="font-sans text-xs text-charcoal/60">
                  {store.addressLine1
                    ? `${store.addressLine1}, ${store.city}, ${store.state} ${store.zip}`
                    : "Brand only — no fixed address"}
                  {store.phone ? ` · ${store.phone}` : ""}
                  {!store.isActive ? " · Disabled" : ""}
                </p>
              </div>
              <ActiveToggleButton action={setStoreActive.bind(null, store.id)} isActive={store.isActive} />
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
