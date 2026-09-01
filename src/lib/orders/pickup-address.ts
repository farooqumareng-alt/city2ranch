/**
 * Resolves the one address a driver actually navigates to for a City
 * Pickup order — prefers the order's own pickup address (set by the
 * customer at request time, or added/edited by a dispatcher — see
 * update-pickup-address.ts) over the store's own address, since a
 * "store" can now be brand-only with no fixed location at all (see the
 * comment on stores.addressLine1 in schema.ts). Falls back to the
 * store's address when the order has none set, for a store that does
 * have one fixed real location. Returns null when neither exists —
 * every caller must handle that case explicitly (never invent a
 * pickup address) rather than silently pass an empty string through to
 * a maps link.
 */
export type PickupAddressSource = {
  pickupAddressLine1: string | null;
  pickupAddressLine2: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupZip: string | null;
  storeAddressLine1: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeZip: string | null;
};

export type ResolvedPickupAddress = {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string | null;
  /** Which source this came from — lets a caller show "as entered by
   *  the customer" vs. "store's address" if that distinction matters. */
  source: "order" | "store";
};

export function resolvePickupAddress(order: PickupAddressSource): ResolvedPickupAddress | null {
  if (order.pickupAddressLine1 && order.pickupCity && order.pickupState) {
    return {
      addressLine1: order.pickupAddressLine1,
      addressLine2: order.pickupAddressLine2,
      city: order.pickupCity,
      state: order.pickupState,
      zip: order.pickupZip,
      source: "order",
    };
  }
  if (order.storeAddressLine1 && order.storeCity && order.storeState) {
    return {
      addressLine1: order.storeAddressLine1,
      addressLine2: null,
      city: order.storeCity,
      state: order.storeState,
      zip: order.storeZip,
      source: "store",
    };
  }
  return null;
}

/** One-line display string, e.g. for a card or a heading — never
 *  invents "address unknown" copy itself, since what to say about a
 *  missing address is presentation-specific (customer vs. staff vs.
 *  driver each want different wording for that state). */
export function formatPickupAddress(resolved: ResolvedPickupAddress): string {
  const line2 = resolved.addressLine2 ? `, ${resolved.addressLine2}` : "";
  const zip = resolved.zip ? ` ${resolved.zip}` : "";
  return `${resolved.addressLine1}${line2}, ${resolved.city}, ${resolved.state}${zip}`;
}
