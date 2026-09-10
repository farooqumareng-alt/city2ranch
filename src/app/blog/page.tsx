import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPublishedBlogPosts, excerptFor } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "News and notes from City2Ranch.",
};

// Forced dynamic rather than relying on revalidatePath() alone — this
// page's own DB call (getPublishedBlogPosts, via postgres-js) isn't one
// of the APIs Next's static/dynamic analysis treats as an automatic
// opt-out, so it built static by default despite reading the database.
// The admin's own "publishes and it appears right away" requirement is
// exactly what this guarantees with no caching-layer ambiguity: every
// request re-queries, full stop.
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-24">
      <SectionHeading eyebrow="CITY2RANCH" title="Blog" description="News and notes from the concierge team." />

      {posts.length === 0 ? (
        <EmptyState message="Nothing posted yet — check back soon." />
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-5 transition-colors hover:border-gold"
            >
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- an admin-entered external URL, not a local/optimizable asset
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="aspect-[16/9] w-full rounded-sm object-cover"
                />
              ) : null}
              <p className="font-sans text-xs uppercase tracking-[0.1em] text-charcoal/50">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
              </p>
              <h2 className="font-serif text-xl text-navy-deep group-hover:text-gold">{post.title}</h2>
              <p className="font-sans text-sm leading-relaxed text-charcoal/75">{excerptFor(post)}</p>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
