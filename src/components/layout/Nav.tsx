import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SITE_NAME } from "@/lib/constants";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { NavAuthControl } from "@/components/layout/NavAuthControl";
import { PrimaryNavLinks } from "@/components/layout/PrimaryNavLinks";
import { RequestServiceCta } from "@/components/layout/RequestServiceCta";

export function Nav() {
  return (
    <header className="relative z-40 border-b border-navy/10 bg-ivory">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label={SITE_NAME}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a
              plain <img> avoids next/image's SVG size-inference issues
              with this file's viewBox-only sizing */}
          <img src="/logo.svg" alt={SITE_NAME} className="h-11 w-auto sm:h-12" />
        </Link>

        <PrimaryNavLinks />

        <div className="hidden items-center gap-6 md:flex">
          <NavAuthControl variant="desktop" />
          <RequestServiceCta className="inline-flex items-center justify-center rounded-sm bg-gold px-5 py-2.5 font-sans text-sm font-medium text-navy-deep transition-colors hover:bg-gold-light" />
        </div>

        <MobileMenu />
      </Container>
    </header>
  );
}
