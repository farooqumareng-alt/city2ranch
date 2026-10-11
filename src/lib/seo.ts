import type { Metadata } from "next";
import { SITE_TAGLINE } from "./constants";

/**
 * Canonical site origin. In production this comes from
 * NEXT_PUBLIC_SITE_URL (set on Vercel); the localhost fallback keeps
 * `next dev` working without env config.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.city2ranch.com"
).replace(/\/$/, "");

export const DEFAULT_OG_IMAGE = "/og-image.png";

/** Absolute URL for a site path, used for canonicals and openGraph.url. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Shared metadata fragment: canonical link + unique Open Graph /
 * Twitter tags. Spread into each page's `metadata` export so every
 * public page gets a canonical URL and complete social tags with
 * zero duplication.
 */
export function pageSeo({
  path,
  title,
  description,
}: {
  /** Site path, e.g. "/about". */
  path: string;
  /** Page title *without* the " — City2Ranch" suffix (the root layout template adds it). */
  title: string;
  description: string;
}): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const url = absoluteUrl(path);
  const ogTitle = `${title} — City2Ranch`;
  const image = {
    url: DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
    alt: `City2Ranch — ${SITE_TAGLINE}`,
  };
  return {
    alternates: { canonical: url },
    openGraph: {
      url,
      title: ogTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
