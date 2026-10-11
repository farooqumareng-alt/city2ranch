import type { MetadataRoute } from "next";
import { getPublishedBlogPosts } from "@/lib/blog";
import { SERVICE_AREAS } from "@/data/service-areas";

const ROUTES = [
  "",
  "/services",
  "/how-it-works",
  "/service-area",
  "/request-service",
  "/request-service/concierge",
  "/about",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
];

// Published blog posts are added dynamically (2026-09-09) — the whole
// point of a self-service blog is content that search engines find,
// and a static route list can never know about a post added after the
// last deploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticEntries = ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.6,
  }));

  const posts = await getPublishedBlogPosts();
  const postEntries = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt ?? new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  // Service-area landing pages (2026-10-11) — one per launch community,
  // generated from src/data/service-areas.ts so new areas are indexed
  // automatically on the next deploy.
  const areaEntries = SERVICE_AREAS.map((area) => ({
    url: `${baseUrl}/service-area/${area.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...areaEntries, ...postEntries];
}
