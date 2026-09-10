"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/types";

const initialState: ActionResult | undefined = undefined;

type ToggleAction = (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;

/** Same shape as ActiveToggleButton, for setBlogPostStatus — a
 *  dedicated component rather than reusing that one directly, since
 *  the hidden field name ("status", not "isActive") and labels
 *  (Publish/Unpublish, not Enable/Disable) both differ. */
export function BlogStatusToggleButton({
  action,
  status,
}: {
  /** Already bound to the post's id, e.g. setBlogPostStatus.bind(null, id). */
  action: ToggleAction;
  status: "draft" | "published";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isPublished = status === "published";

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="status" value={isPublished ? "draft" : "publish"} />
      <Button type="submit" variant="outline-dark" size="md" disabled={pending}>
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="font-sans text-xs text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
