import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";
import { SITE_PHONE_TEL, SITE_TAGLINE } from "@/lib/constants";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo";
import "./globals.css";

const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const defaultDescription =
  "City Convenience. Ranch Delivered. Private concierge shopping, essentials and delivery for ranches, estates and rural properties.";

const ogImage = {
  url: DEFAULT_OG_IMAGE,
  width: 1200,
  height: 630,
  alt: `City2Ranch — ${SITE_TAGLINE}`,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "City2Ranch — Private Rural Concierge & Delivery",
    template: "%s — City2Ranch",
  },
  description: defaultDescription,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    siteName: "City2Ranch",
    type: "website",
    url: SITE_URL,
    title: "City2Ranch — Private Rural Concierge & Delivery",
    description: "City Convenience. Ranch Delivered.",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "City2Ranch — Private Rural Concierge & Delivery",
    description: "City Convenience. Ranch Delivered.",
    images: [DEFAULT_OG_IMAGE],
  },
};

// Site-wide structured data: Organization + the local service business.
// Rendered as a native script tag per the Next.js JSON-LD guide.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "City2Ranch",
      url: SITE_URL,
      slogan: SITE_TAGLINE,
      description: defaultDescription,
      telephone: SITE_PHONE_TEL,
      logo: `${SITE_URL}/logo.svg`,
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#business`,
      name: "City2Ranch",
      url: SITE_URL,
      description:
        "Private rural concierge and delivery: groceries, shopping, essentials, hardware, pet supplies, packages and errands delivered to ranches, estates and rural properties on scheduled routes.",
      telephone: SITE_PHONE_TEL,
      priceRange: "$$",
      areaServed: "Rural communities served by scheduled City2Ranch routes",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-ivory font-sans text-charcoal antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Nav />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <StickyMobileCTA />
      </body>
    </html>
  );
}
