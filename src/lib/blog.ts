import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";

/** Satisfied by both getDb()'s pooled connection and a db.transaction()
 *  callback's `tx` — same convention as my-services.ts's AnyDb, added
 *  here so a deep test can exercise both of these against real,
 *  rolled-back rows instead of live (and here, unauthenticated)
 *  production data. */
type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Used by /blog — no auth, this is genuinely public content. Never
 *  selects `content` itself: the list page only ever shows the
 *  excerpt, so there's no reason to pull a potentially long post body
 *  over the wire for a page that won't render it. */
export async function getPublishedBlogPosts(db: AnyDb = getDb()) {
  return db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      content: blogPosts.content,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));
}

const FALLBACK_EXCERPT_LENGTH = 160;

/** The blog list page's fallback when a post has no excerpt of its own
 *  (BlogPostForm's own hint promises exactly this) — the start of the
 *  content, cut at the nearest word boundary rather than mid-word. */
export function excerptFor(post: { excerpt: string | null; content: string }): string {
  if (post.excerpt) return post.excerpt;
  const flat = post.content.trim().replace(/\s+/g, " ");
  if (flat.length <= FALLBACK_EXCERPT_LENGTH) return flat;
  const cut = flat.slice(0, FALLBACK_EXCERPT_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Splits plain-text content into paragraphs on blank lines, for
 *  /blog/[slug] to render as real <p> elements rather than one
 *  pre-wrapped block — see the doc comment on blogPosts.content in
 *  schema.ts for why this app treats blog content as plain text
 *  rather than Markdown/HTML. */
export function paragraphsFor(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Used by /blog/[slug] — status is checked here too, not just left to
 *  the caller, so a draft's slug can never be guessed/loaded directly
 *  even though its RLS policy would already block a direct Data API
 *  request (see the storage-policy migration's own comment on why
 *  that's a backstop, not the app's real boundary). */
export async function getPublishedBlogPostBySlug(slug: string, db: AnyDb = getDb()) {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  return rows[0] ?? null;
}
