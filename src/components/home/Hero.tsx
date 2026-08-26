import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SITE_EYEBROW } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
      {/* Subtle horizon/fence-line motif in place of photography — keeps the
          hero fast (no external image request) while still evoking a
          ranch skyline at dusk. Swap for real property photography when
          available. */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-gold/10"
        preserveAspectRatio="none"
        viewBox="0 0 1200 160"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0 140 L120 120 L220 135 L340 100 L460 130 L600 90 L740 132 L860 105 L980 138 L1100 112 L1200 130 V160 H0 Z"
          fill="currentColor"
        />
      </svg>

      <Container className="relative flex flex-col gap-8 py-28 sm:py-36">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-gold" aria-hidden />
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            {SITE_EYEBROW}
          </span>
        </div>

        <h1 className="max-w-3xl font-serif text-5xl leading-[1.1] text-ivory sm:text-6xl md:text-7xl">
          City Convenience.
          <br />
          Ranch Delivered.
        </h1>

        <p className="max-w-xl font-sans text-lg leading-relaxed text-ivory/80">
          Tell us what you need — groceries, hardware, pharmacy runs, special
          requests — and we&apos;ll shop, pick up, and deliver it to your
          ranch, estate, or rural property.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button href="/request-service" variant="gold" size="lg">
            Request Service
          </Button>
          <Button href="/service-area" variant="outline-light" size="lg">
            Check Service Area
          </Button>
        </div>

        <p className="font-sans text-sm text-ivory/60">
          Already have an order waiting at the store?{" "}
          <Link href="/orders/new" className="underline decoration-gold/50 underline-offset-4 hover:text-gold">
            Request a pickup
          </Link>{" "}
          instead.
        </p>

        <p className="font-sans text-sm uppercase tracking-wide text-ivory/50">
          By Appointment &middot; Premium Service &middot; Select Rural Routes
        </p>
      </Container>
    </section>
  );
}
