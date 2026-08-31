import { redirect } from "next/navigation";

// Merged into the unified Work Queue's "Needs Quote" tab (approved UX
// blueprint) — kept as a redirect, not deleted.
export default function ConciergeQueueRedirect() {
  redirect("/internal/dispatch/queue?tab=needs_quote");
}
