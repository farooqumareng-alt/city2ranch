/**
 * Shown while a panel page (account/dispatch/driver) is still loading —
 * see the loading.tsx in each of those route groups. Wrapping a page in
 * loading.tsx lets Next.js show this immediately on navigation instead
 * of a blank/frozen screen until the server round trip (DB queries
 * included) finishes; the surrounding layout — sidebar, "Signed in as"
 * — stays mounted and interactive the whole time, since loading.tsx
 * only replaces the page segment, not the layout around it.
 */
export function PanelLoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-10" aria-hidden>
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="h-3 w-24 rounded-sm bg-navy/10" />
        <div className="h-8 w-64 rounded-sm bg-navy/10" />
        <div className="h-4 w-full max-w-md rounded-sm bg-navy/10" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-20 rounded-sm bg-navy/5" />
        <div className="h-20 rounded-sm bg-navy/5" />
        <div className="h-20 rounded-sm bg-navy/5" />
      </div>
    </div>
  );
}
