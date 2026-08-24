import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "City2Ranch — Private Rural Concierge & Delivery",
    template: "%s — City2Ranch",
  },
  description:
    "City Convenience. Ranch Delivered. Private concierge shopping, essentials and delivery for ranches, estates and rural properties.",
  openGraph: {
    siteName: "City2Ranch",
    type: "website",
    title: "City2Ranch — Private Rural Concierge & Delivery",
    description: "City Convenience. Ranch Delivered.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-ivory font-sans text-charcoal antialiased">
        <Nav />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <StickyMobileCTA />
      </body>
    </html>
  );
}
