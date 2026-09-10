import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getPublishedBlogPostBySlug, paragraphsFor, excerptFor } from "@/lib/blog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return { title: post.title, description: excerptFor(post) };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <Container className="flex flex-col gap-8 py-16 sm:py-24">
      <Link href="/blog" className="font-sans text-sm text-charcoal/60 hover:text-gold">
        ← Back to Blog
      </Link>

      <div className="flex max-w-2xl flex-col gap-4">
        <p className="font-sans text-xs uppercase tracking-[0.1em] text-gold">
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : ""}
        </p>
        <h1 className="font-serif text-3xl leading-tight text-navy-deep sm:text-4xl">{post.title}</h1>
      </div>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- an admin-entered external URL, not a local/optimizable asset
        <img
          src={post.coverImageUrl}
          alt=""
          className="aspect-[16/9] w-full max-w-2xl rounded-sm object-cover"
        />
      ) : null}

      <div className="flex max-w-2xl flex-col gap-4 font-sans text-base leading-relaxed text-charcoal/85">
        {paragraphsFor(post.content).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </Container>
  );
}
