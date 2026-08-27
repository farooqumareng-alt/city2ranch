/**
 * Formats a plain "YYYY-MM-DD" date column (requestedDeliveryDate on
 * orders/service_requests) for display. Builds the Date from its Y/M/D
 * parts rather than `new Date(iso)` — the latter parses as UTC midnight,
 * which can print as the previous day in any timezone behind UTC.
 */
export function formatPlainDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
