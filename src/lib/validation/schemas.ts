import { z } from "zod";
import { DROPOFF_LOCATION_OPTIONS } from "@/lib/constants";

// Shared primitives so every form validates ZIP/phone/email consistently,
// both client-side (for inline feedback) and server-side (source of truth).
const zip = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "Enter a 5-digit ZIP code.");

const requiredText = (label: string, min = 1) =>
  z.string().trim().min(min, `${label} is required.`);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalZip = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^\d{5}$/.test(v), "Enter a 5-digit ZIP code.");

// A native <input type="date"> always submits "" or "YYYY-MM-DD" — never a
// customer-typed price or ZIP, just a plain calendar date the concierge
// team treats as a target, not a guarantee.
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date.");

const email = z.email("Enter a valid email address.");
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.");

export const zipCheckSchema = z.object({
  zip,
});

export const waitlistSchema = z.object({
  name: requiredText("Name"),
  email,
  phone,
  zip,
  city: requiredText("City"),
  preferredFrequency: requiredText("Preferred frequency"),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const foundingMemberSchema = z.object({
  name: requiredText("Name"),
  email,
  phone,
  zip,
  propertyLocation: requiredText("Property location"),
  preferredStores: optionalText,
  shoppingFrequency: requiredText("Shopping frequency"),
  servicesNeeded: optionalText,
  preferredDays: optionalText,
});
export type FoundingMemberInput = z.infer<typeof foundingMemberSchema>;

export const serviceTypeValues = [
  "groceries",
  "private_shopping",
  "essentials",
  "hardware",
  "pet_ranch",
  "packages",
  "restaurant",
  "errands",
  "other",
] as const;

export const serviceRequestSchema = z.object({
  name: requiredText("Name"),
  email,
  phone,
  addressLine1: requiredText("Address"),
  addressLine2: optionalText,
  city: requiredText("City"),
  state: requiredText("State", 2),
  zip,
  serviceType: z.enum(serviceTypeValues),
  preferredStore: optionalText,
  shoppingList: optionalText,
  estimatedOrderValue: optionalText,
  timingPreference: requiredText("Timing preference"),
  requestedDeliveryDate: optionalDate,
  notes: optionalText,
  // Captured silently from ?ref=<slug> on /request-service — never a
  // user-typed field, so no length/format validation needed beyond
  // treating an empty string as absent, same as every other optional
  // field here.
  referralSource: optionalText,
});
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export const orderSubmitSchema = z.object({
  storeId: z.uuid("Select a store."),
  retailerOrderNumber: requiredText("Order/confirmation number"),
  customerName: requiredText("Full name"),
  customerPhone: phone,
  pickupNotes: optionalText,
  deliveryAddressLine1: requiredText("Address"),
  deliveryAddressLine2: optionalText,
  deliveryCity: requiredText("City"),
  deliveryState: requiredText("State", 2),
  deliveryZip: zip,
  customerNotes: optionalText,
  requestedDeliveryDate: optionalDate,
});
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;

// Every field optional — a customer can save just a name and phone
// without an address, or update one field at a time. Nothing here is
// required the way an order submission is.
export const profileUpdateSchema = z.object({
  name: optionalText,
  phone: optionalText,
  defaultDeliveryAddressLine1: optionalText,
  defaultDeliveryAddressLine2: optionalText,
  defaultDeliveryCity: optionalText,
  defaultDeliveryState: optionalText,
  defaultDeliveryZip: optionalZip,
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// A concierge shopping-list row. quantity is free text on purpose — "2
// gallons", "1 dozen", "3" all need to fit without a unit enum staff
// would have to fight with for a one-off request.
export const conciergeOrderItemSchema = z.object({
  itemName: requiredText("Item name"),
  quantity: requiredText("Quantity"),
  notes: optionalText,
});

/**
 * Staff-side concierge order intake. Items arrive as one hidden JSON
 * input (see NewConciergeOrderForm) rather than bracket-notation field
 * names — every other form in this app is a flat single-record submit,
 * and a dynamic-row array doesn't fit that shape cleanly.
 */
export const conciergeOrderCreateSchema = z.object({
  customerName: requiredText("Full name"),
  customerEmail: email,
  customerPhone: phone,
  deliveryAddressLine1: requiredText("Address"),
  deliveryAddressLine2: optionalText,
  deliveryCity: requiredText("City"),
  deliveryState: requiredText("State", 2),
  deliveryZip: zip,
  customerNotes: optionalText,
  requestedDeliveryDate: optionalDate,
  itemsJson: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid item list." });
        return z.NEVER;
      }
    })
    .pipe(z.array(conciergeOrderItemSchema).min(1, "Add at least one item.")),
});
export type ConciergeOrderCreateInput = z.infer<typeof conciergeOrderCreateSchema>;

// A quote line as staff types it — a dollar-and-cents string ("75.00"),
// converted to the integer cents every other price field in this app
// already uses.
export const feeLineSchema = z
  .object({
    label: requiredText("Fee label"),
    amount: requiredText("Amount"),
  })
  .transform((value, ctx) => {
    const amountCents = Math.round(Number(value.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter a valid amount greater than zero.",
      });
      return z.NEVER;
    }
    return { label: value.label, amountCents };
  });

export const conciergeQuoteFinalizeSchema = z.object({
  feeLinesJson: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid fee line list." });
        return z.NEVER;
      }
    })
    .pipe(z.array(feeLineSchema).min(1, "Add at least one fee line.")),
});

// "My Places" — a customer's saved address book. label is freeform
// ("Ranch", "Lake House") rather than a fixed list of property types.
const dropoffLocationValues: string[] = DROPOFF_LOCATION_OPTIONS.map((o) => o.value);
const optionalDropoffLocation = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || dropoffLocationValues.includes(v), "Choose a valid option.");

export const placeSchema = z.object({
  label: requiredText("Place name"),
  addressLine1: requiredText("Address"),
  addressLine2: optionalText,
  city: requiredText("City"),
  state: requiredText("State", 2),
  zip,
  gateCode: optionalText,
  dropoffLocation: optionalDropoffLocation,
  accessNotes: optionalText,
});
export type PlaceInput = z.infer<typeof placeSchema>;

export const householdRole = z.enum(["full", "ordering", "view_only"]);

export const householdInviteSchema = z.object({
  email,
  // Defaults to "full" so an empty/omitted field (e.g. an older client)
  // keeps today's behavior — full delegated access.
  role: householdRole.default("full"),
});

// A saved shopping list — same item shape as conciergeOrderItemSchema
// (free-text quantity, same reason: "2 gallons"/"1 dozen"/"3" all need
// to fit without a unit enum), submitted the same hidden-JSON-input way
// as every other dynamic-row form in this app.
export const shoppingListItemSchema = z.object({
  itemName: requiredText("Item name"),
  quantity: requiredText("Quantity"),
  notes: optionalText,
});

export const shoppingListSaveSchema = z.object({
  name: requiredText("List name"),
  itemsJson: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid item list." });
        return z.NEVER;
      }
    })
    .pipe(z.array(shoppingListItemSchema).min(1, "Add at least one item.")),
});

export const contactSchema = z.object({
  name: requiredText("Name"),
  email,
  phone: optionalText,
  subject: requiredText("Subject"),
  message: requiredText("Message", 10),
});
export type ContactInput = z.infer<typeof contactSchema>;
