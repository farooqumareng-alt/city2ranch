import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Request Service",
  description: "Tell City2Ranch what you need — we'll route you to the right place.",
};

const CHOICES = [
  {
    href: "/orders/new",
    emoji: "🛒",
    title: "Pick up my order",
    description: "You've already ordered from a store. We'll pick it up and bring it to you.",
  },
  {
    href: "/request-service/concierge",
    emoji: "🛍️",
    title: "Shop for me",
    description: "Send us your list. We'll handle the shopping.",
  },
  {
    href: "/recurring-services/new",
    emoji: "🔁",
    title: "Repeat something",
    description: "Set up a recurring service on a schedule.",
  },
];

/**
 * The Request Service entry point from the approved UX blueprint —
 * routes a customer to the right existing form without making them
 * name "City Pickup" or "Concierge" themselves. The Concierge form
 * itself moved to ./concierge/page.tsx; City Pickup (/orders/new) and
 * Recurring (/recurring-services/new) were already their own pages and
 * are unchanged.
 *
 * ?tier= (membership interest, from /membership and the homepage
 * ServiceTiers section) and ?ref= (a partner referral link/QR code —
 * see service_requests.referralSource) both always mean Concierge, so
 * they skip the choice screen entirely rather than making a customer
 * who already expressed clear intent pick again.
 */
export default async function RequestServicePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; ref?: string }>;
}) {
  const params = await searchParams;
  if (params.tier || params.ref) {
    const query = new URLSearchParams();
    if (params.tier) query.set("tier", params.tier);
    if (params.ref) query.set("ref", params.ref);
    redirect(`/request-service/concierge?${query.toString()}`);
  }

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="REQUEST SERVICE"
        title="What can we help you with?"
        description="Tell us what you need and we'll take it from there."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {CHOICES.map((choice) => (
          <Link
            key={choice.href}
            href={choice.href}
            className="flex flex-col gap-2 rounded-sm border border-navy/10 bg-white/60 p-6 transition-colors hover:border-gold hover:bg-white"
          >
            <span aria-hidden="true" className="text-2xl">
              {choice.emoji}
            </span>
            <h3 className="font-serif text-lg text-navy-deep">{choice.title}</h3>
            <p className="font-sans text-sm text-charcoal/70">{choice.description}</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
