import type { ReactNode } from "react";
import Link from "next/link";

/** Generalizes the `divide-y border-y` bordered-list shell already
 *  duplicated twice in src/app/internal/dispatch/admin/page.tsx (once
 *  for the staff list, once for the driver list) — same classNames,
 *  so adopting it there is a zero-visual-diff swap. */
export function RowList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col divide-y divide-navy/10 border-y border-navy/10 ${className}`}>
      {children}
    </div>
  );
}

/** One row inside a RowList. Pass `href` to make the whole row a link —
 *  used by the Operations Center's Needs Attention feed to deep-link
 *  each item to where it's actually actionable; omit it for a plain
 *  non-clickable row like admin/page.tsx's staff/driver rows, which
 *  already have their own inline action buttons. */
export function Row({
  children,
  href,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div className={`flex flex-wrap items-center justify-between gap-4 py-4 ${className}`}>{children}</div>
  );
  return href ? (
    <Link href={href} className="block hover:bg-white/50">
      {inner}
    </Link>
  ) : (
    inner
  );
}
