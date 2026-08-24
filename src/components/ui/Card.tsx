import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-sm border border-navy/10 bg-white/60 p-6 shadow-sm transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
