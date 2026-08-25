import { z } from "zod";

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
  notes: optionalText,
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
});
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;

export const contactSchema = z.object({
  name: requiredText("Name"),
  email,
  phone: optionalText,
  subject: requiredText("Subject"),
  message: requiredText("Message", 10),
});
export type ContactInput = z.infer<typeof contactSchema>;
