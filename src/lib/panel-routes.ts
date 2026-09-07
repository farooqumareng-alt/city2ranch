/**
 * Routes where a PanelSidebar (AccountSidebar/StaffSidebar/DriverSidebar)
 * already renders its own in-panel navigation — the top Nav's public
 * marketing links (Home/How It Works/...) would be confusing clutter
 * there (a "Home" link ambiguous with the account's own /home) and
 * still hide on these routes via PrimaryNavLinks. As of 2026-09-07,
 * NavAuthControl/RequestServiceCta/MobileMenu no longer check this —
 * account controls (My Account, Sign Out, Request Service) moved out
 * of PanelSidebar into the header everywhere, so they no longer need
 * to hide anywhere. Only PrimaryNavLinks still uses this.
 */
export function isPanelRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/my-services") ||
    pathname.startsWith("/requests") ||
    pathname.startsWith("/deliveries") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/places") ||
    pathname.startsWith("/lists") ||
    pathname.startsWith("/recurring-services") ||
    pathname.startsWith("/household") ||
    pathname.startsWith("/membership") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/internal")
  );
}
