/**
 * Whether the two services every form submission depends on (database +
 * email) have real credentials configured. Checked explicitly, at request
 * time, before any form server action touches the network — this is what
 * lets forms fail with an honest "temporarily unavailable" message
 * instead of a fake success when `DATABASE_URL` / `RESEND_API_KEY` are
 * unset (e.g. before the team has provisioned Neon/Resend).
 */
export function formServicesConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) && Boolean(process.env.RESEND_API_KEY);
}

export const SERVICE_UNAVAILABLE_MESSAGE =
  "We're unable to submit your request online right now. Please call or email us directly and a concierge will assist you.";
