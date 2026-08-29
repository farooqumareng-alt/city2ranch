// Shared, non-visual content used across the site: navigation, service
// catalogue, tier copy, and other structured data that pages/components
// compose together. Keeping this separate from components keeps copy
// edits low-risk and out of JSX.

export const SITE_NAME = "City2Ranch";
export const SITE_TAGLINE = "City Convenience. Ranch Delivered.";
export const SITE_EYEBROW = "PRIVATE RURAL CONCIERGE & DELIVERY";

export type NavLink = {
  label: string;
  href: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Services", href: "/services" },
  { label: "Service Area", href: "/service-area" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const FOOTER_LINKS: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Service Area", href: "/service-area" },
  { label: "Business & Estates", href: "/#estates" },
  { label: "Property Partners", href: "/#partners" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export type Service = {
  name: string;
  description: string;
};

export const SERVICES: Service[] = [
  {
    name: "Groceries",
    description:
      "Your weekly groceries, household essentials and everyday shopping.",
  },
  {
    name: "Private Shopping",
    description: "Tell us what you need. We'll handle the city-side shopping.",
  },
  {
    name: "Essentials",
    description: "Household goods, personal items and everyday necessities.",
  },
  {
    name: "Hardware & Supplies",
    description:
      "Need something from a hardware or specialty store? We'll make the trip.",
  },
  {
    name: "Pet & Ranch Needs",
    description: "Everyday supplies for your household, pets and property.",
  },
  {
    name: "Packages & Pickups",
    description: "Selected pickup, drop-off and return services.",
  },
  {
    name: "Restaurant & Takeout",
    description: "Enjoy city restaurants without making the drive.",
  },
  {
    name: "Personal Errands",
    description: "Special requests considered on a case-by-case basis.",
  },
];

export type ServiceTier = {
  key: string;
  name: string;
  subtitle: string;
  description: string;
  features: string[];
  cta: string;
};

export const SERVICE_TIERS: ServiceTier[] = [
  {
    key: "route",
    name: "Route",
    subtitle: "Scheduled Rural Service",
    description:
      "For customers who want dependable recurring deliveries.",
    features: [
      "Scheduled route",
      "Preferred delivery window",
      "Grocery and shopping requests",
      "Delivery notifications",
    ],
    cta: "Join a Route",
  },
  {
    key: "private",
    name: "Private",
    subtitle: "Personal Concierge Service",
    description: "For customers who want greater flexibility.",
    features: [
      "Priority scheduling",
      "Personal shopping",
      "Multiple shopping stops",
      "Special requests",
      "Flexible delivery",
    ],
    cta: "Request Private Service",
  },
  {
    key: "estate",
    name: "Estate",
    subtitle: "Private Estate Concierge",
    description:
      "For high-value households, ranches, estates and recurring clients.",
    features: [
      "Dedicated concierge relationship",
      "Priority service",
      "Recurring household needs",
      "Multiple errands",
      "Custom arrangements",
      "Personalized service",
    ],
    cta: "Request a Consultation",
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Tell Us",
    description: "Submit your shopping list, request or errand.",
  },
  {
    step: "02",
    title: "We Handle the City",
    description:
      "Our concierge coordinates shopping, pickup and preparation.",
  },
  {
    step: "03",
    title: "We Bring It to You",
    description:
      "Your order arrives at your ranch or rural property during your scheduled service window.",
  },
];

export const WHY_CITY2RANCH = [
  { title: "Private", description: "Your service is personal and discreet." },
  { title: "Reliable", description: "We build dependable routes and service windows." },
  { title: "Convenient", description: "Stop spending hours driving for everyday needs." },
  { title: "Personal", description: "You're not just another delivery number." },
];

export const SERVICE_TYPE_OPTIONS = [
  { value: "groceries", label: "Grocery shopping" },
  { value: "private_shopping", label: "Private shopping" },
  { value: "essentials", label: "Household essentials" },
  { value: "hardware", label: "Hardware / supplies" },
  { value: "pet_ranch", label: "Pet supplies" },
  { value: "packages", label: "Package pickup / drop-off" },
  { value: "restaurant", label: "Restaurant / takeout" },
  { value: "errands", label: "Personal errand" },
  { value: "other", label: "Other" },
] as const;

export const TIMING_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "one_time", label: "One-time" },
  { value: "next_available", label: "Next available" },
  { value: "on_demand", label: "Private / on-demand request" },
] as const;

// Mirrors src/lib/db/schema.ts's householdRoleEnum — kept as plain
// strings here (not imported from the schema) since this file also
// backs client components, which can't import server-only DB code.
export const HOUSEHOLD_ROLE_OPTIONS = [
  { value: "full", label: "Full access — can request service and pay" },
  { value: "ordering", label: "Can request service, can't pay" },
  { value: "view_only", label: "View only" },
] as const;

export const DROPOFF_LOCATION_OPTIONS = [
  { value: "front_door", label: "Front door" },
  { value: "back_door", label: "Back door" },
  { value: "garage", label: "Garage" },
  { value: "gate", label: "Gate / front entrance" },
  { value: "barn", label: "Barn" },
  { value: "hand_to_someone", label: "Hand to someone at the property" },
  { value: "other", label: "Other — see notes" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "occasional", label: "Occasional" },
] as const;
