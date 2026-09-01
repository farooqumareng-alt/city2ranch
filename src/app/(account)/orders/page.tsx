import { redirect } from "next/navigation";

// Merged into My Services (approved UX blueprint, Decision 2) — kept as
// a redirect rather than deleted so any bookmark or external link still
// lands somewhere real, matching the blueprint's Navigation map
// disposition for this route ("Rename").
export default function OrdersRedirect() {
  redirect("/my-services");
}
