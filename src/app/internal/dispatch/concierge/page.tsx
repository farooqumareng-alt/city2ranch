import { redirect } from "next/navigation";

// Merged into the unified Work Queue's "Needs Quote" tab (approved UX
// blueprint), which itself merged into Orders (2026-09-16) — kept as a
// redirect, not deleted. Points straight at the final destination
// rather than through /internal/dispatch/queue's own redirect, to
// avoid a needless double-hop.
export default function ConciergeQueueRedirect() {
  redirect("/internal/dispatch?tab=needs_quote");
}
