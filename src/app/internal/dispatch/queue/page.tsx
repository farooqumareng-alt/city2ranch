import { redirect } from "next/navigation";

/**
 * Work Queue merged into Overview as one "Orders" screen (2026-09-16,
 * business-first navigation redesign) — kept as a redirect, not
 * deleted, same discipline as every other consolidated route in this
 * app (see (account)/requests/page.tsx). The tab query param is
 * preserved so every existing bookmark/link (tile clicks, notification
 * emails, the old /internal/dispatch/concierge redirect) still lands on
 * the right tab of the merged board.
 */
export default async function WorkQueueRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(tab ? `/internal/dispatch?tab=${tab}` : "/internal/dispatch");
}
