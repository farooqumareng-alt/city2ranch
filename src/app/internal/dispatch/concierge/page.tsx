import { redirect } from "next/navigation";

// Merged into the unified Work Queue's "Needs Quote" tab (approved UX
// blueprint), which itself merged into Orders (2026-09-16) — kept as a
// redirect, not deleted. Points straight at the final destination
// rather than through /internal/dispatch/queue's own redirect, to
// avoid a needless double-hop. Target updated to "pending_quotes"
// (2026-09-18, panel redesign) — this old page only ever showed
// already-converted concierge orders awaiting a quote, never raw
// unconverted leads, so that's the more faithful of the two tabs the
// old single "Needs Quote" bucket now splits into.
export default function ConciergeQueueRedirect() {
  redirect("/internal/dispatch?tab=pending_quotes");
}
