import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Shadow reference to Supabase's auth.users table — lets us express real
// foreign keys from our tables to auth identities without owning that
// table (Supabase Auth manages its schema itself).
const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

// Shared status lifecycle for the marketing-site lead-capture tables
// below. These are top-of-funnel inquiries, not real orders — a human
// (concierge team) follows up manually, so a simple 4-state lifecycle is
// all that's needed.
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
 * General "Private Service" inquiries from /request-service — guest-open,
 * free-text, top-of-funnel. NOT the real City Pickup order flow (see
 * `orders` below) — this table intentionally stays simple and unlinked
 * to any customer account; a concierge follows up by phone/email.
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

/**
 * Staff/dispatcher role marker. No self-serve signup — a row is inserted
 * manually (Supabase SQL editor) once someone has signed in via magic
 * link at least once, using their real auth.users id.
 */
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id),
    label: text("label"),
  },
  (table) => [unique().on(table.authUserId)]
);

/**
 * Self-service account info, separate from `orders` — a customer edits
 * this once on /profile rather than retyping name/phone/address on every
 * order. All fields nullable: a signed-in customer with no profile yet
 * (or an existing order placed before this table existed) is a normal
 * state, not an error — the order form just has nothing to pre-fill
 * from. No saved payment info here; Stripe Checkout handles that fresh
 * per order and nothing payment-related is ever stored in our own DB.
 */
export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id),
    name: text("name"),
    phone: text("phone"),
    defaultDeliveryAddressLine1: text("default_delivery_address_line1"),
    defaultDeliveryAddressLine2: text("default_delivery_address_line2"),
    defaultDeliveryCity: text("default_delivery_city"),
    defaultDeliveryState: text("default_delivery_state"),
    defaultDeliveryZip: text("default_delivery_zip"),
  },
  (table) => [unique().on(table.authUserId)]
);

// ---------------------------------------------------------------------
// City Pickup order fulfillment (Phase 1 real product)
// ---------------------------------------------------------------------

// A City Pickup order's real lifecycle. Deliberately smaller than the
// long-term spec's full 20-state model — "at pickup"/"picked up" collapse
// into one driver action, and "delivered"/"completed" collapse into one
// atomic PIN-verification transition, because nothing yet exists to
// independently query those intermediate states. Later phases add more
// values purely via `ALTER TYPE order_status ADD VALUE` — additive, no
// migration of existing rows required.
export const orderStatusEnum = pgEnum("order_status", [
  "priced",
  "payment_pending",
  "paid",
  "driver_assigned",
  "picked_up",
  "in_transit",
  "completed",
  "cancelled",
  "failed",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "customer",
  "staff",
  "driver",
  "system",
]);

/**
 * Supported pickup locations. A table (not an enum) because a driver
 * needs a real street address to navigate to, and the list grows via a
 * row insert as the pilot corridor expands — not a code deploy.
 */
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  addressLine1: text("address_line1").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
});

/**
 * Drivers are a distinct role from `staff` (dispatchers). Deliberately
 * has no employment-status field — 1099 vs. W-2 is a real-world
 * contracting decision, not a schema one.
 */
export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id),
    name: text("name").notNull(),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
    label: text("label"),
  },
  (table) => [unique().on(table.authUserId)]
);

/**
 * Configurable pricing, versioned by row rather than mutated in place —
 * every order snapshots its computed price at request time, so a later
 * pricing change never alters a historical order. Only one row should
 * have `isActive = true` at a time (enforced by the app, not the DB).
 *
 * baseFeeCents/perMileCents/minFeeCents remain the internal formula used
 * to derive a price from distance (useful for route economics, driver
 * comp, and viability checks) — but that breakdown is never shown to the
 * customer. serviceLabel is the customer-facing name for what they're
 * actually being charged (e.g. "Rural Route Service"); a null value
 * falls back to a generic label in app code rather than forcing every
 * row to have one via a DB constraint.
 */
export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  serviceLabel: text("service_label"),
  baseFeeCents: integer("base_fee_cents").notNull(),
  perMileCents: integer("per_mile_cents").notNull(),
  minFeeCents: integer("min_fee_cents"),
  isActive: boolean("is_active").notNull().default(true),
  note: text("note"),
});

/**
 * Staff-maintained ZIP -> round-trip-mileage lookup for the single pilot
 * corridor. Deliberately not a geocoding integration — a small,
 * hand-maintained table is the right-sized replacement while there's one
 * hub and a handful of served ZIPs, and it guarantees a customer can
 * never manually enter or manipulate the mileage a price is based on.
 */
export const zipMileage = pgTable("zip_mileage", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  zip: text("zip").notNull().unique(),
  roundTripMiles: numeric("round_trip_miles", {
    precision: 6,
    scale: 1,
  }).notNull(),
  label: text("label"),
});

/**
 * A real City Pickup order: the customer already has their own order
 * with a supported retailer; City2Ranch handles pickup and delivery.
 * Pricing fields are a snapshot at request time (see pricingRules above),
 * never recomputed from a later-changed rule.
 */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  authUserId: uuid("auth_user_id")
    .notNull()
    .references(() => authUsers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),

  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  retailerOrderNumber: text("retailer_order_number").notNull(),
  pickupReadyAt: timestamp("pickup_ready_at", { withTimezone: true }),
  pickupNotes: text("pickup_notes"),

  deliveryAddressLine1: text("delivery_address_line1").notNull(),
  deliveryAddressLine2: text("delivery_address_line2"),
  deliveryCity: text("delivery_city").notNull(),
  deliveryState: text("delivery_state").notNull(),
  deliveryZip: text("delivery_zip")
    .notNull()
    .references(() => zipMileage.zip),
  customerNotes: text("customer_notes"),

  status: orderStatusEnum("status").notNull().default("priced"),

  pricingRuleId: uuid("pricing_rule_id")
    .notNull()
    .references(() => pricingRules.id),
  // Snapshotted from pricingRules.serviceLabel at request time — the
  // customer-facing name, e.g. "Rural Route Service". Never null (the
  // fallback used when the rule itself has no label is resolved and
  // stored here), so a later rename of the rule doesn't retroactively
  // change what a historical order displays.
  serviceLabel: text("service_label").notNull(),
  roundTripMiles: numeric("round_trip_miles", {
    precision: 6,
    scale: 1,
  }).notNull(),
  // Internal cost breakdown only (route economics, driver comp) — the
  // customer never sees "base" or "mileage" as separate line items, only
  // serviceLabel + totalCents.
  baseFeeCents: integer("base_fee_cents").notNull(),
  mileageFeeCents: integer("mileage_fee_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("usd"),

  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  driverId: uuid("driver_id").references(() => drivers.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),

  deliveryPin: text("delivery_pin"),
  pinVerifiedAt: timestamp("pin_verified_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  failureReason: text("failure_reason"),
});

/**
 * Immutable log of every real state transition on an order. actorId is
 * always the acting person's auth.users id regardless of role (customer/
 * staff/driver) so this table never needs to know which role table to
 * join; null for actorType = 'system' (e.g. the Stripe webhook).
 */
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  actorType: auditActorTypeEnum("actor_type").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  metadata: jsonb("metadata"),
});
