import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Shared status lifecycle for anything that lands in an ops queue.
// Phase 1 only ever writes "new"; later phases (admin dashboard) will
// move rows through the rest of the lifecycle.
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "converted",
  "closed",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "groceries",
  "private_shopping",
  "essentials",
  "hardware",
  "pet_ranch",
  "packages",
  "restaurant",
  "errands",
  "other",
]);

/**
 * Waitlist signups captured from the ZIP-check widget's "Coming Soon"
 * branch (Home + /service-area).
 */
export const serviceAreaLeads = pgTable("service_area_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  zip: text("zip").notNull(),
  city: text("city").notNull(),
  preferredFrequency: text("preferred_frequency").notNull(),
  status: leadStatusEnum("status").notNull().default("new"),
});

/**
 * Founding-member / early-access signups (Home page section).
 */
export const foundingMembers = pgTable("founding_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  zip: text("zip").notNull(),
  propertyLocation: text("property_location").notNull(),
  preferredStores: text("preferred_stores"),
  shoppingFrequency: text("shopping_frequency").notNull(),
  servicesNeeded: text("services_needed"),
  preferredDays: text("preferred_days"),
  status: leadStatusEnum("status").notNull().default("new"),
});

/**
 * /request-service submissions.
 */
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  preferredStore: text("preferred_store"),
  shoppingList: text("shopping_list"),
  estimatedOrderValue: text("estimated_order_value"),
  timingPreference: text("timing_preference").notNull(),
  notes: text("notes"),
  status: leadStatusEnum("status").notNull().default("new"),
});

/**
 * /contact submissions.
 */
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: leadStatusEnum("status").notNull().default("new"),
});
