/**
 * Routes where a PanelSidebar (AccountSidebar/StaffSidebar/DriverSidebar)
 * already renders its own account nav + Sign Out — the top Nav's public
 * marketing links, "Request Service" CTA, and account menu would all
 * just duplicate what the sidebar already covers there. Shared by
 * NavAuthControl, PrimaryNavLinks, RequestServiceCta, and MobileMenu so
 * they all agree on the same route list rather than drifting into
 * slightly different ones.
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
    pathname.startsWith("/household") ||
    pathname.startsWith("/membership") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/internal")
  );
}
