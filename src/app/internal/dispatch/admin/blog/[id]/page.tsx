import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { BlogPostForm } from "@/components/forms/BlogPostForm";
import { DeleteBlogPostButton } from "@/components/dispatch/DeleteBlogPostButton";
import { getBlogPostForEdit, updateBlogPost, deleteBlogPost } from "@/lib/actions/blog-management";
import { requireSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const post = await getBlogPostForEdit(id);
  if (!post) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading eyebrow="CONTENT" title={`Edit "${post.title}"`} description="Update this post below." />
        {post.status === "published" ? (
          <Button href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" variant="outline-dark">
            View Live
          </Button>
        ) : null}
      </div>
      <div className="max-w-2xl">
        <BlogPostForm action={updateBlogPost.bind(null, post.id)} post={post} status={post.status} />
      </div>
      <div className="max-w-2xl border-t border-navy/10 pt-6">
        <DeleteBlogPostButton action={deleteBlogPost.bind(null, post.id)} />
      </div>
    </div>
  );
}
