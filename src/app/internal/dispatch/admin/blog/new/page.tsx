import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BlogPostForm } from "@/components/forms/BlogPostForm";
import { createBlogPost } from "@/lib/actions/blog-management";
import { requireSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "New Post" };

export default async function NewBlogPostPage() {
  await requireSuperAdmin();

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading
        eyebrow="CONTENT"
        title="New Post"
        description="Save it as a draft to come back to later, or publish it right away."
      />
      <div className="max-w-2xl">
        <BlogPostForm action={createBlogPost} />
      </div>
    </div>
  );
}
