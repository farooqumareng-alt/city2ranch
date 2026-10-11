import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { SERVICES, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";
import type { ServiceArea } from "@/data/service-areas";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Tell Us",
    description: "Submit your shopping list, request, or errand.",
  },
  {
    title: "We Handle the City",
    description:
      "Our concierge coordinates shopping, pickup, and preparation in Fort Worth.",
  },
  {
    title: "We Bring It to You",
    description:
      "Your order arrives at your property during your scheduled service window.",
  },
];

/**
 * Reusable template for /service-area/[region] landing pages.
 * All area-specific copy comes from the `area` data object so every
 * page is unique — the structure stays consistent for UX and SEO.
 */
export function ServiceAreaTemplate({ area }: { area: ServiceArea }) {
  const pageUrl = absoluteUrl(`/service-area/${area.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${pageUrl}#service`,
        name: "City2Ranch",
        url: pageUrl,
        telephone: SITE_PHONE_TEL,
        description: area.metaDescription,
        areaServed: {
          "@type": "City",
          name: area.name,
          containedInPlace: {
            "@type": "State",
            name: "Texas",
          },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: area.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <Container className="flex flex-col gap-16 py-16 sm:py-24">
        {/* Hero */}
        <div className="flex max-w-3xl flex-col gap-6">
          <SectionHeading
            eyebrow="SERVICE AREA"
            level="h1"
            title={`Private Rural Concierge & Delivery in ${area.name}, ${area.state}`}
            description={area.tagline}
          />
          {area.intro.map((paragraph, index) => (
            <p
              key={index}
              className="font-sans text-base leading-relaxed text-charcoal/80 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
          <div className="flex flex-wrap gap-4">
            <Button href="/request-service" variant="navy" size="lg">
              Request Service
            </Button>
            <Button href="/service-area" variant="outline-dark" size="lg">
              Check Your ZIP
            </Button>
          </div>
        </div>

        {/* Why this area fits */}
        <section aria-label={`Why ${area.name} fits the City2Ranch model`}>
          <SectionHeading
            eyebrow="THE FIT"
            title={`Why ${area.name} fits the City2Ranch model.`}
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {area.localNotes.map((note, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-sm border border-navy/10 bg-ivory p-5"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                  aria-hidden
                />
                <p className="font-sans text-sm leading-relaxed text-charcoal/85 sm:text-base">
                  {note}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Services recap */}
        <section aria-label="Services">
          <SectionHeading
            eyebrow="SERVICES"
            title="What we deliver."
            description={`Every service below is available in ${area.name} on your scheduled route.`}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <div
                key={service.name}
                className="flex flex-col gap-2 rounded-sm border border-navy/10 p-5"
              >
                <h3 className="font-serif text-lg text-navy-deep">
                  {service.name}
                </h3>
                <p className="font-sans text-sm leading-relaxed text-charcoal/70">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-label="How it works">
          <SectionHeading
            eyebrow="HOW IT WORKS"
            title="A better way to get what you need."
          />
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className="font-serif text-4xl text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-xl text-navy-deep">
                  {step.title}
                </h3>
                <p className="font-sans text-sm leading-relaxed text-charcoal/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Route info */}
        <section
          aria-label="Route information"
          className="rounded-sm bg-navy-deep px-6 py-12 sm:px-12"
        >
          <SectionHeading
            tone="light"
            eyebrow="SCHEDULED ROUTES"
            title="Built around routes, not one-off deliveries."
            description={`City2Ranch creates scheduled rural routes so customers in ${area.name} and surrounding communities share dependable, recurring access to Fort Worth shopping and concierge services. Founding members help determine where each new route goes next.`}
          />
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/request-service" variant="gold">
              Join a Route
            </Button>
            <a
              href={`tel:${SITE_PHONE_TEL}`}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-ivory/40 px-6 py-2.5 font-sans text-sm font-medium text-ivory transition-colors duration-200 hover:border-gold hover:text-gold"
            >
              Call {SITE_PHONE_DISPLAY}
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section aria-label="Frequently asked questions">
          <SectionHeading
            eyebrow="FAQ"
            title={`Common questions about service in ${area.name}.`}
          />
          <div className="mt-8 flex max-w-3xl flex-col gap-6">
            {area.faqs.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-navy/10 pb-6"
              >
                <h3 className="font-serif text-lg text-navy-deep">
                  {faq.question}
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-charcoal/75 sm:text-base">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
