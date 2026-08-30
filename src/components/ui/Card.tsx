import type { ReactNode } from "react";

const PADDING = {
  sm: "p-4",
  md: "p-6",
} as const;

export function Card({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  /** "md" (p-6) matches every existing hand-rolled card in the app —
   *  the default, so adopting this component is a zero-visual-diff
   *  swap unless a caller opts into "sm" (p-4, for compact tiles like
   *  a dashboard stat card, where p-6 reads as too much whitespace). */
  padding?: keyof typeof PADDING;
}) {
  return (
    <div
      className={`rounded-sm border border-navy/10 bg-white/60 ${PADDING[padding]} shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
