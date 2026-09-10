import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { getPublishedBlogPosts, getPublishedBlogPostBySlug, excerptFor, paragraphsFor } from "@/lib/blog";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Live deep test for the blog's public read side (2026-09-09) — the
 * one behavior that actually matters for a self-service admin blog: a
 * draft must never be visible, and a published post must be. Same
 * zero-persistence discipline as lifecycle-integration.test.ts:
 * getDb().transaction() + unconditional rollback, with the
 * transaction's `tx` passed into getPublishedBlogPosts()/
 * getPublishedBlogPostBySlug()'s own injectable `db` param — neither
 * function has an auth gate (this is public content), so unlike the
 * write side (blog-management.ts, untested for the same structural
 * reason every mutating action in this codebase is untested — see
 * this session's own deep-test report), there's nothing to mock here.
 */
const db = getDb();
const ROLLBACK = Symbol("rollback-on-purpose");

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let thrown: unknown;
  let hasThrown = false;
  try {
    await db.transaction(async (tx) => {
      try {
        result = await fn(tx);
      } catch (e) {
        thrown = e;
        hasThrown = true;
      }
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  if (hasThrown) throw thrown;
  return result as T;
}

describe("blog public reads — a draft never leaks, a published post always shows", () => {
  it("a draft appears in neither the list nor by slug", async () => {
    await withRollback(async (tx) => {
      const [draft] = await tx
        .insert(blogPosts)
        .values({ title: "Unfinished Post", slug: "unfinished-post", content: "Not ready yet.", status: "draft" })
        .returning({ id: blogPosts.id, slug: blogPosts.slug });

      const list = await getPublishedBlogPosts(tx);
      expect(list.find((p) => p.id === draft.id)).toBeUndefined();

      const bySlug = await getPublishedBlogPostBySlug(draft.slug, tx);
      expect(bySlug).toBeNull();
    });
  });

  it("a published post appears in both, with the right fields, and disappears once unpublished", async () => {
    await withRollback(async (tx) => {
      const publishedAt = new Date();
      const [post] = await tx
        .insert(blogPosts)
        .values({
          title: "City2Ranch Turns One",
          slug: "city2ranch-turns-one",
          excerpt: "A short look back.",
          content: "Paragraph one.\n\nParagraph two.",
          status: "published",
          publishedAt,
        })
        .returning({ id: blogPosts.id, slug: blogPosts.slug });

      const list = await getPublishedBlogPosts(tx);
      const listed = list.find((p) => p.id === post.id);
      expect(listed, "published post should appear in the list").toBeTruthy();
      expect(listed!.excerpt).toBe("A short look back.");

      const bySlug = await getPublishedBlogPostBySlug(post.slug, tx);
      expect(bySlug, "published post should be fetchable by slug").toBeTruthy();
      expect(bySlug!.title).toBe("City2Ranch Turns One");
      expect(bySlug!.content).toBe("Paragraph one.\n\nParagraph two.");

      // Mirrors what setBlogPostStatus actually does when "Unpublish" is
      // clicked — flips status back to draft, same row, same slug.
      await tx.update(blogPosts).set({ status: "draft" }).where(eq(blogPosts.id, post.id));
      const afterUnpublish = await getPublishedBlogPostBySlug(post.slug, tx);
      expect(afterUnpublish, "unpublished post should no longer be fetchable by slug").toBeNull();
    });
  });

  it("orders the list newest-published-first", async () => {
    await withRollback(async (tx) => {
      const older = new Date("2026-01-01T00:00:00Z");
      const newer = new Date("2026-06-01T00:00:00Z");
      const [postA] = await tx
        .insert(blogPosts)
        .values({ title: "Older Post", slug: "older-post", content: "First.", status: "published", publishedAt: older })
        .returning({ id: blogPosts.id });
      const [postB] = await tx
        .insert(blogPosts)
        .values({ title: "Newer Post", slug: "newer-post", content: "Second.", status: "published", publishedAt: newer })
        .returning({ id: blogPosts.id });

      const list = await getPublishedBlogPosts(tx);
      const indexA = list.findIndex((p) => p.id === postA.id);
      const indexB = list.findIndex((p) => p.id === postB.id);
      expect(indexB).toBeLessThan(indexA);
    });
  });
});

describe("excerptFor", () => {
  it("uses the real excerpt when one exists", () => {
    expect(excerptFor({ excerpt: "A real summary.", content: "Ignored." })).toBe("A real summary.");
  });

  it("falls back to the content, cut at a word boundary, when there's no excerpt", () => {
    const longContent = "word ".repeat(60).trim();
    const result = excerptFor({ excerpt: null, content: longContent });
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThan(longContent.length);
  });

  it("returns short content unchanged (no ellipsis) when it fits", () => {
    expect(excerptFor({ excerpt: null, content: "Short." })).toBe("Short.");
  });
});

describe("paragraphsFor", () => {
  it("splits on blank lines and trims each paragraph", () => {
    expect(paragraphsFor("First.\n\nSecond.\n\n\nThird.")).toEqual(["First.", "Second.", "Third."]);
  });

  it("drops leading/trailing blank sections", () => {
    expect(paragraphsFor("\n\nOnly one.\n\n")).toEqual(["Only one."]);
  });
});
