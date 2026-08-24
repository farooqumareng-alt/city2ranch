// Ground truth for which ZIP codes City2Ranch actually serves today.
//
// Per the brand's own positioning ("Currently establishing select rural
// routes"), this starts empty rather than fabricated — every ZIP check
// falls into the "Coming Soon" / waitlist branch until a real route is
// live. Add a ZIP here only once City2Ranch is actually delivering to it.
export const SERVED_ZIP_CODES: readonly string[] = [
  // e.g. "76024", "76085", "76086"
];

export function isZipServed(zip: string): boolean {
  return SERVED_ZIP_CODES.includes(zip);
}
