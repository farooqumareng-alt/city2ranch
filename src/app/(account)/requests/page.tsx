import { redirect } from "next/navigation";

// Folded into My Services as "Under review" cards (approved UX
// blueprint, Decision 1 & 2) — kept as a redirect, not deleted.
export default function RequestsRedirect() {
  redirect("/my-services");
}
