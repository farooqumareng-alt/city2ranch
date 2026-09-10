"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { blogPostSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const FORM_FIELDS = ["title", "excerpt", "content", "coverImageUrl"];
const LIST_PATH = "/internal/dispatch/admin/blog";
const PUBLIC_BLOG_PATH = "/blog";

function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return base || "post";
}

/** Plain slugified title in the common case (a distinct title); a short
 *  random suffix only when that collides with an existing post, so most
 *  posts get a clean URL and nobody has to think about uniqueness. */
async function uniqueSlugFor(db: ReturnType<typeof getDb>, title: string): Promise<string> {
  const base = slugify(title);
  const existing = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.slug, base));
  if (existing.length === 0) return base;
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Used by the admin blog list — every post, draft and published. */
export async function listBlogPosts() {
  await requireSuperAdmin();
  const db = getDb();
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

/** Used by the edit page. */
export async function getBlogPostForEdit(id: string) {
  await requireSuperAdmin();
  const db = getDb();
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  return rows[0] ?? null;
}

function parseBlogPost(formData: FormData) {
  return blogPostSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    coverImageUrl: formData.get("coverImageUrl"),
  });
}

/**
 * The compose form submits one of two buttons — name="intent"
 * value="draft" or "publish" — read here rather than as a separate
 * action, so both share the same validation/slug-generation path.
 */
export async function createBlogPost(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const parsed = parseBlogPost(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const publishNow = formData.get("intent") === "publish";
  const db = getDb();
  let newId: string;
  try {
    const slug = await uniqueSlugFor(db, parsed.data.title);
    const [row] = await db
      .insert(blogPosts)
      .values({
        ...parsed.data,
        slug,
        authorStaffId: admin.id,
        status: publishNow ? "published" : "draft",
        publishedAt: publishNow ? new Date() : null,
      })
      .returning({ id: blogPosts.id });
    newId = row.id;
  } catch (error) {
    console.error("[createBlogPost] failed", error);
    return {
      ok: false,
      message: "We couldn't save this post right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  revalidatePath(PUBLIC_BLOG_PATH);
  redirect(`${LIST_PATH}/${newId}`);
}

/**
 * Bound as `updateBlogPost.bind(null, id)`. Like createBlogPost, the
 * form's two submit buttons share name="intent" — "draft" or
 * "publish" — and this always sets status to match exactly what the
 * button said, including taking a live post back down if "Save Draft"
 * is clicked while editing one (the button's own label promises
 * exactly that, not "save without changing status"). The list page's
 * quick toggle is the separate setBlogPostStatus() above. Slug is
 * never touched here — see the doc comment on blogPosts.slug in
 * schema.ts for why a post's URL must stay stable once created.
 */
export async function updateBlogPost(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = parseBlogPost(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  const publish = formData.get("intent") === "publish";
  const db = getDb();
  try {
    const existingRows = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    const existing = existingRows[0];
    if (!existing) return { ok: false, message: "Post not found." };

    // Stamped once, the first time a post goes live — republishing
    // after an edit shouldn't jump it back to "just posted" and reorder
    // the public list ahead of genuinely newer posts.
    const nextPublishedAt = publish ? (existing.publishedAt ?? new Date()) : existing.publishedAt;

    await db
      .update(blogPosts)
      .set({
        ...parsed.data,
        status: publish ? "published" : "draft",
        publishedAt: nextPublishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id));
  } catch (error) {
    console.error("[updateBlogPost] failed", error);
    return {
      ok: false,
      message: "We couldn't save this post right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath(PUBLIC_BLOG_PATH);
  return { ok: true };
}

/**
 * Bound as `setBlogPostStatus.bind(null, id)` — a quick publish/
 * unpublish toggle for the list page, distinct from updateBlogPost:
 * this never touches title/content, so flipping a post's status
 * doesn't require resubmitting its entire body (updateBlogPost's own
 * schema validation would otherwise reject an empty content field the
 * list page's toggle form was never going to send).
 */
export async function setBlogPostStatus(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();
  const publish = formData.get("status") === "publish";
  const db = getDb();
  try {
    const existingRows = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, id));
    if (!existingRows[0]) return { ok: false, message: "Post not found." };

    await db
      .update(blogPosts)
      .set({
        status: publish ? "published" : "draft",
        publishedAt: publish ? (existingRows[0].publishedAt ?? new Date()) : existingRows[0].publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id));
  } catch (error) {
    console.error("[setBlogPostStatus] failed", error);
    return { ok: false, message: "We couldn't update this post right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  revalidatePath(PUBLIC_BLOG_PATH);
  return { ok: true };
}

/** Bound as `deleteBlogPost.bind(null, id)` — a real delete, not a
 *  deactivate: unlike orders/drivers/stores, nothing else in the schema
 *  references a blog post, so there's no history to preserve by keeping
 *  a disabled row around. */
export async function deleteBlogPost(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention, unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  await requireSuperAdmin();
  const db = getDb();
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  } catch (error) {
    console.error("[deleteBlogPost] failed", error);
    return { ok: false, message: "We couldn't delete this post right now. Please try again shortly." };
  }
  revalidatePath(LIST_PATH);
  revalidatePath(PUBLIC_BLOG_PATH);
  redirect(LIST_PATH);
}
