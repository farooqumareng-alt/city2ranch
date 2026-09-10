"use client";

import { useActionState } from "react";
import { TextField, TextareaField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

export type BlogPostDefaults = {
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
};

/**
 * Shared create/edit form for the admin blog — same bound-server-action
 * pattern as StoreForm (the caller passes createBlogPost or
 * updateBlogPost.bind(null, id)). Two submit buttons share one
 * `name="intent"` field rather than two separate forms, so both go
 * through the exact same validation path (blog-management.ts reads
 * intent to decide draft vs. published).
 *
 * `status` is shown only when editing an existing post — a brand-new
 * post has no status yet to describe, and "Save Draft"/"Publish" below
 * already say what submitting will do.
 */
export function BlogPostForm({
  action,
  post,
  status,
}: {
  action: (prev: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  post?: BlogPostDefaults;
  status?: "draft" | "published";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      {status ? (
        <p className="font-sans text-xs uppercase tracking-[0.1em] text-charcoal/50">
          Currently {status === "published" ? "live on the site" : "a draft — not visible on the site yet"}
        </p>
      ) : null}

      <TextField
        name="title"
        label="Title"
        required
        defaultValue={values?.title ?? post?.title}
        error={fieldErrors?.title}
      />
      <TextField
        name="excerpt"
        label="Excerpt"
        hint="A short summary shown on the blog list page. Optional — falls back to the start of the post."
        defaultValue={values?.excerpt ?? post?.excerpt ?? ""}
        error={fieldErrors?.excerpt}
      />
      <TextField
        name="coverImageUrl"
        label="Cover image URL"
        hint="Optional — a link to an image already hosted somewhere (no upload yet)."
        defaultValue={values?.coverImageUrl ?? post?.coverImageUrl ?? ""}
        error={fieldErrors?.coverImageUrl}
      />
      <TextareaField
        name="content"
        label="Content"
        required
        rows={16}
        hint="Plain text — leave a blank line between paragraphs. No formatting markup needed."
        defaultValue={values?.content ?? post?.content}
        error={fieldErrors?.content}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="draft" variant="outline-dark" disabled={pending}>
          {pending ? "Saving…" : status === "published" ? "Unpublish & Save" : "Save Draft"}
        </Button>
        <Button type="submit" name="intent" value="publish" variant="navy" disabled={pending}>
          {pending ? "Publishing…" : status === "published" ? "Save & Keep Live" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
