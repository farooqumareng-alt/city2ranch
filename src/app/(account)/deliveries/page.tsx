import { redirect } from "next/navigation";

// Was the same underlying orders table as My Orders, filtered to
// in-progress + completed — that filter is now the "Active" tab on My
// Services instead of a separate page (approved UX blueprint, Decision
// 2). Kept as a redirect, not deleted.
export default function DeliveriesRedirect() {
  redirect("/my-services?filter=active");
}
