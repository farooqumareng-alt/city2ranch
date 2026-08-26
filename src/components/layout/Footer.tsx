import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { FOOTER_LINKS, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-ivory/10 bg-navy-deep pb-24 pt-16 text-ivory md:pb-16">
      <Container className="flex flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a
              plain <img> avoids next/image's SVG size-inference issues
              with this file's viewBox-only sizing */}
          <img src="/logo-white.svg" alt={SITE_NAME} className="h-9 w-auto" />
          <p className="font-sans text-sm text-gold">
            Private Rural Concierge &amp; Delivery
          </p>
          <p className="font-sans text-sm text-ivory/70">{SITE_TAGLINE}</p>
        </div>

        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-1">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-sm text-ivory/75 hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <Container className="mt-12 flex flex-col gap-2 border-t border-ivory/10 pt-6 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
        <p>By Appointment &middot; Premium Service &middot; Select Rural Routes</p>
      </Container>
    </footer>
  );
}
