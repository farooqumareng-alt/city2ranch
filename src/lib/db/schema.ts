import {
  boolean,
  date,
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
// table (Supabase Auth manages its schema itself). Deliberately NOT
// exported and deliberately just the one column: `drizzle-kit generate`
// only tracks tables it can see via this file's exports, and a second
// column here would make it think it owns (and must CREATE/ALTER)
// Supabase's real auth.users table — it doesn't; Supabase does. Code
// outside this file that needs an owner's email (src/lib/household.ts)
// reaches it with a raw SQL subquery instead of importing this table.
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

// A household invite's lifecycle: 'invited' (owner sent it, not yet
// accepted), 'active' (accepted — full delegated access), 'revoked'
// (either the owner cut it off or the member declined/left — same
// terminal state, the timestamps distinguish which if it ever matters).
export const householdMemberStatusEnum = pgEnum("household_member_status", [
  "invited",
  "active",
  "revoked",
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
  // A calendar target, not a promise — staff still confirms real timing
  // by phone/email when they follow up. Nullable: most requests don't
  // name a specific date, just a timingPreference.
  requestedDeliveryDate: date("requested_delivery_date"),
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

/**
 * A customer's saved address book — "My Places" (ranch, lake house, guest
 * house...), not just a single default address. First foundational piece
 * of the long-term customer-account principle: the account is a
 * permanent relationship, not tied to today's one-address, one-service
 * shape. Deliberately decoupled from `orders`/`service_requests` — a
 * place only pre-fills a form's delivery fields client-side; it isn't a
 * foreign key anywhere, so this table can exist without touching any
 * existing order/request logic.
 */
export const customerPlaces = pgTable("customer_places", {
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
  // Customer-chosen name — "Ranch", "Lake House", "Guest House" — not a
  // fixed enum, since there's no fixed list of property types.
  label: text("label").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  // Gate codes, access notes — freeform, shown to whoever fulfills a
  // request placed against this place (copied into the order/request's
  // own notes field at submit time, not read live from here).
  deliveryInstructions: text("delivery_instructions"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Full-delegation household access: an owner invites another email to
 * operate their City2Ranch account — same orders, places, and profile,
 * as if they were the owner. Deliberately flat, no chains: a person is
 * either an independent owner (optionally with members under them) or a
 * delegated member of exactly one owner, never both — enforced in
 * src/lib/actions/household.ts, not here, since a DB constraint can't
 * easily express "not also a member elsewhere." memberAuthUserId stays
 * null until the invited email actually signs in and accepts (proving
 * control of that inbox); getEffectiveOwnerId() only ever resolves
 * through a row with status = 'active'.
 */
export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerAuthUserId: uuid("owner_auth_user_id")
      .notNull()
      .references(() => authUsers.id),
    memberEmail: text("member_email").notNull(),
    memberAuthUserId: uuid("member_auth_user_id").references(() => authUsers.id),
    status: householdMemberStatusEnum("status").notNull().default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.ownerAuthUserId, table.memberEmail)]
);

/**
 * A customer's saved, reusable shopping list ("Weekly Groceries",
 * "Guest House") — one request no longer means retyping the same items
 * every time. Owned by auth_user_id (resolved through household
 * delegation like everything else account-scoped), never referenced by
 * orders/service_requests directly — loading a list just pre-fills a
 * form's shopping-list text client-side, same decoupled relationship
 * customerPlaces has to the delivery-address fields.
 */
export const shoppingLists = pgTable("shopping_lists", {
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
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const shoppingListItems = pgTable("shopping_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  listId: uuid("list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull().default("1"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
});

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
  // Concierge orders only start here — the price isn't known until staff
  // manually builds a quote (see orderFeeLines below). City Pickup orders
  // skip straight to "priced" since their price is computed instantly at
  // submission.
  "quote_pending",
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

// Named "order_service_type" (not "service_type") because that Postgres
// type name is already taken by serviceTypeEnum above, used by
// service_requests — enum *type* names are global even though column
// names are per-table.
export const orderServiceTypeEnum = pgEnum("order_service_type", [
  "pickup",
  "concierge",
]);

// Per-item outcome for a Concierge shopping-list line, recorded by staff
// after the manual, phone-based substitution call described in the
// approved operating model — not a real-time in-app flow.
export const orderItemStatusEnum = pgEnum("order_item_status", [
  "requested",
  "found",
  "substituted",
  "unavailable",
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
  // Placeholder market slug — every row is "default" until a second
  // market actually launches. Exists now purely so adding one later is a
  // data change, not a schema migration; no market-switcher UI yet.
  market: text("market").notNull().default("default"),
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
  // See stores.market — "exactly one active row" (enforced in
  // getActivePricingRule()) becomes "exactly one active row per market"
  // once a second market exists; no functional effect while there's one.
  market: text("market").notNull().default("default"),
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
  // See stores.market. zip stays globally unique regardless — this is
  // metadata for a future market-filtered admin view, not a lookup key.
  market: text("market").notNull().default("default"),
});

/**
 * A real order — either City Pickup (the customer already has their own
 * order with a supported retailer; City2Ranch handles pickup and
 * delivery) or Concierge (City2Ranch shops/purchases on the customer's
 * behalf, per serviceType). One shared table rather than two: every
 * downstream piece of infrastructure (status machine, audit log, Stripe
 * webhook, PIN flow, dispatch/driver queries) is keyed on one orders.id,
 * and duplicating all of that for a second table would be far more code
 * than the six columns below going nullable.
 *
 * Pricing fields are a snapshot at request time (see pricingRules above
 * for City Pickup, orderFeeLines below for Concierge), never recomputed
 * from a later-changed rule.
 */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  serviceType: orderServiceTypeEnum("service_type").notNull().default("pickup"),
  // Set when a concierge order was promoted from a /request-service
  // submission — null for phone-only intake staff enters directly, and
  // always null for City Pickup orders.
  serviceRequestId: uuid("service_request_id").references(
    () => serviceRequests.id
  ),

  // Nullable: a concierge order is created by staff before the customer
  // has necessarily signed in (the source service_requests submission is
  // guest-open). Claimed later via src/lib/actions/claim-order.ts once
  // the customer signs in with a matching email. Always set immediately
  // for City Pickup, which requires sign-in up front.
  authUserId: uuid("auth_user_id").references(() => authUsers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),

  // storeId/retailerOrderNumber: City Pickup only — null for concierge
  // orders until staff picks a store while building the quote. An order
  // always has at most one store; a concierge trip needing a second stop
  // is represented as an "Additional Stop Fee" line item, not a second
  // store row (see orderFeeLines).
  storeId: uuid("store_id").references(() => stores.id),
  retailerOrderNumber: text("retailer_order_number"),
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
  // When the customer would like it delivered by — a target for
  // dispatch/driver scheduling, not a contractual guarantee. Applies to
  // both service types; nullable since most orders don't name one.
  requestedDeliveryDate: date("requested_delivery_date"),

  // Concierge orders start at "quote_pending" (see orderStatusEnum) and
  // have no default here that would silently mislabel them — every
  // insert sets this explicitly.
  status: orderStatusEnum("status").notNull().default("priced"),

  // pricingRuleId/roundTripMiles/baseFeeCents/mileageFeeCents: City
  // Pickup only — its automated base+mileage calculation. Null for
  // concierge orders, whose price comes entirely from staff-entered
  // orderFeeLines instead; there is no automated Concierge pricing yet.
  pricingRuleId: uuid("pricing_rule_id").references(() => pricingRules.id),
  // Snapshotted from pricingRules.serviceLabel (City Pickup) or set
  // directly by staff (Concierge) at request/quote time — the
  // customer-facing name, e.g. "Rural Route Service" or "Concierge
  // Shopping & Delivery". Never null, so a later rename of the rule
  // doesn't retroactively change what a historical order displays.
  serviceLabel: text("service_label").notNull(),
  roundTripMiles: numeric("round_trip_miles", {
    precision: 6,
    scale: 1,
  }),
  // Internal cost breakdown only (route economics, driver comp) — the
  // customer never sees "base" or "mileage" as separate line items, only
  // serviceLabel + totalCents.
  baseFeeCents: integer("base_fee_cents"),
  mileageFeeCents: integer("mileage_fee_cents"),
  // The one column everything downstream reads (Stripe, dispatch,
  // driver, order detail), for both service types. For City Pickup it's
  // base+mileage; for Concierge it's the sum of orderFeeLines, snapshotted
  // once when staff finalizes the quote — never derived at read time.
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
 * Reference list of common grocery/shopping items, grouped by category —
 * powers "quick add" suggestions on the customer request-service form and
 * the staff concierge order builder, so neither has to be typed from
 * scratch. Read-only from the app today (no admin UI yet); seeded via
 * migration, editable directly in the DB until one exists. category is
 * free text, not an enum, on purpose — the category list is expected to
 * evolve without a schema migration.
 */
export const commonGroceryItems = pgTable("common_grocery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * A Concierge order's shopping list — one row per requested item.
 * quantity is free text ("2 gallons", "1 dozen", "3"), not an
 * integer+unit pair, since staff types it once per item and a units enum
 * would need to anticipate every unit customers might use. status/
 * substitutionNote support the manual, phone-based substitution workflow
 * from the approved operating model: staff calls the customer if an item
 * is unavailable and records the outcome here — not a real-time in-app
 * flow, and never editable by the driver.
 */
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  quantity: text("quantity").notNull().default("1"),
  notes: text("notes"),
  status: orderItemStatusEnum("status").notNull().default("requested"),
  substitutionNote: text("substitution_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * A Concierge order's staff-built quote — one row per named fee (e.g.
 * "City2Ranch Service Fee", "Shopping/Concierge Fee", "Additional Stop
 * Fee"). There is no automated Concierge pricing engine; staff enters
 * these directly. orders.totalCents is recomputed as the sum of these
 * and snapshotted once when the quote is finalized (see
 * src/lib/pricing/fee-lines.ts) — never derived at read time, so nothing
 * downstream (Stripe, dispatch, driver, order detail) needs to change to
 * support Concierge pricing.
 */
export const orderFeeLines = pgTable("order_fee_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
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
