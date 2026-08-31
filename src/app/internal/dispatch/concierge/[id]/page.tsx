import { redirect } from "next/navigation";

// Generalized into the unified Service Record (approved UX blueprint) —
// that page handles every service type, not just Concierge, so this
// concierge-only route now just redirects there. Kept, not deleted, so
// any existing bookmark or link still lands somewhere real.
export default async function ConciergeQuoteRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/internal/dispatch/orders/${id}`);
}
