import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowList, Row } from "@/components/ui/RowList";
import { BlogStatusToggleButton } from "@/components/dispatch/BlogStatusToggleButton";
import { listBlogPosts, setBlogPostStatus } from "@/lib/actions/blog-management";
import { requireSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogAdminPage() {
  // Re-checked here, not just relied on via listBlogPosts()'s own gate
  // or DispatchLayout — every page in this app re-verifies its own
  // authorization independently.
  await requireSuperAdmin();
  const posts = await listBlogPosts();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="CONTENT"
          title="Blog"
          description="Write or paste a post here and publish it straight to the site — no engineering needed."
        />
        <Button href="/internal/dispatch/admin/blog/new" variant="navy">
          New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState message="No posts yet." />
      ) : (
        <RowList>
          {posts.map((post) => (
            <Row key={post.id}>
              {/* Just the title links, not the whole row — this row also
                  has BlogStatusToggleButton's <form> in it, and nesting a
                  form inside an anchor is invalid HTML (same reasoning as
                  the Stores list). */}
              <div>
                <Link
                  href={`/internal/dispatch/admin/blog/${post.id}`}
                  className="font-sans text-sm text-navy-deep underline decoration-navy/20 hover:text-gold"
                >
                  {post.title}
                </Link>
                <p className="font-sans text-xs text-charcoal/60">
                  {post.status === "published" ? "Live" : "Draft"}
                  {post.publishedAt ? ` · Published ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <BlogStatusToggleButton action={setBlogPostStatus.bind(null, post.id)} status={post.status} />
            </Row>
          ))}
        </RowList>
      )}
    </div>
  );
}
