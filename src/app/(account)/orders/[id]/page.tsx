import { redirect } from "next/navigation";

// Renamed to /my-services/[id] (approved UX blueprint, Navigation map).
// Kept as a redirect, not deleted, so every existing link — emails
// already sent, browser history, bookmarks — keeps working.
export default async function OrderDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/my-services/${id}`);
}
