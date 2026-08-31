/** A plain Google Maps deep link built from address columns already on
 *  the order/store — no maps library, no API key, nothing tracked.
 *  Extracted from the driver page (now used from both the pickup and
 *  delivery links on the Job Detail screen). */
export function mapsUrl(line1: string, city: string, state: string, zip?: string | null): string {
  const destination = encodeURIComponent(`${line1}, ${city}, ${state}${zip ? " " + zip : ""}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
