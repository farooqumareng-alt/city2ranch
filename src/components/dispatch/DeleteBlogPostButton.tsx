"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type DeleteAction = (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;

/**
 * The first real (non-deactivate) delete button in this app's admin
 * UI — every other admin list (Stores, Staff, Drivers) uses an
 * isActive toggle instead, since real orders/assignments reference
 * those rows. A blog post has no such history to preserve (see the
 * doc comment on deleteBlogPost in blog-management.ts), so a plain
 * delete is the right action here; window.confirm() is the simplest
 * possible guard against a stray click, not a custom modal — nothing
 * else in this codebase has needed one yet.
 */
export function DeleteBlogPostButton({ action }: { action: DeleteAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete this post permanently? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline-dark" disabled={pending}>
        {pending ? "Deleting…" : "Delete Post"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="mt-1 font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
