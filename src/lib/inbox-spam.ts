/**
 * A conservative heuristic, not a real classifier — this project has no
 * ML/third-party spam-detection infra, and building one wasn't the ask.
 * Flags for review (the Inbox's own "Likely Spam" tab), never deletes or
 * hides anything outright — a false positive still shows up under "All".
 *
 * Added 2026-09-25 after a real example: a contact-form bot submitted
 * name="Dear http://city2ranch.com/fekal0911 Admin", a throwaway gmail,
 * a garbage phone number, and a message repeating "Hi ... Owner" —
 * exactly the SEO/backlink contact-form spam pattern this targets. A
 * real person never puts a URL in their own name field; that single
 * signal is the strongest and cheapest one available, so it alone is
 * enough to flag. Everything else here is corroborating, not
 * independently sufficient, to keep false positives low.
 */

const URL_PATTERN = /https?:\/\/|www\.\S+\.\w{2,}/i;

// Phrases that show up constantly in templated contact-form spam and
// essentially never in a genuine customer message to a grocery-delivery
// business.
const SPAM_PHRASES = [
  /\bdear\s+\S+\s+(admin|owner)\b/i,
  /\bhi\s+\S+\s+owner\b/i,
  /\bseo\b/i,
  /\bbacklink/i,
  /\bincrease (your )?(website )?traffic\b/i,
  /\btop (google )?rankings?\b/i,
  /\bguest post/i,
  /\bunsubscribe\b/i,
];

function countUrls(text: string): number {
  return (text.match(/https?:\/\/\S+/gi) ?? []).length;
}

export function looksLikeSpam(entry: {
  name: string;
  email: string;
  context: string;
  message: string | null;
}): boolean {
  // A URL in the name field is the strongest possible signal — nothing
  // else needs to agree.
  if (URL_PATTERN.test(entry.name)) return true;

  const body = `${entry.context} ${entry.message ?? ""}`;
  if (countUrls(body) >= 2) return true;

  const phraseHits = SPAM_PHRASES.filter((pattern) => pattern.test(entry.name) || pattern.test(body)).length;
  // Two independent template phrases (not just one — "SEO" alone could
  // be a real customer asking about something unrelated) plus at least
  // one URL anywhere in the body together are treated as spam.
  return phraseHits >= 2 && countUrls(body) >= 1;
}
