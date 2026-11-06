import type { ReactNode } from "react";

const PADDING = {
  sm: "p-4",
  md: "p-6",
} as const;

const VARIANT = {
  /**
   * The app-surface card (UI modernization Phase 1, 2026-11-04):
   * solid white, generously rounded, soft layered shadow — the SaaS
   * dashboard card. Default, because nearly every Card caller is a
   * signed-in panel (dispatch, driver, account).
   */
  app: "rounded-xl border border-navy/10 bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover",
  /**
   * The original brand card: translucent white, sharp corner, hairline
   * shadow — kept for public-site callers (the homepage ServicesGrid),
   * whose editorial look is deliberately different from the panels.
   */
  brand:
    "rounded-sm border border-navy/10 bg-white/60 shadow-sm transition-shadow duration-200 hover:shadow-md",
} as const;

export function Card({
  children,
  className = "",
  padding = "md",
  variant = "app",
}: {
  children: ReactNode;
  className?: string;
  /** "md" (p-6) matches every existing hand-rolled card in the app —
   *  the default. "sm" (p-4) is for compact tiles like a dashboard
   *  stat card, where p-6 reads as too much whitespace. */
  padding?: keyof typeof PADDING;
  variant?: keyof typeof VARIANT;
}) {
  return <div className={`${VARIANT[variant]} ${PADDING[padding]} ${className}`}>{children}</div>;
}
