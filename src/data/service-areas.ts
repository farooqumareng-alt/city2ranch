/**
 * Service-area landing page data.
 *
 * Each entry powers one statically-generated page at /service-area/[slug].
 * Copy is written per-area (never templated boilerplate) so every page is
 * genuinely unique — see docs/seo-location-pages.md for the content rules.
 *
 * To launch a new area: add an entry here, run lint + typecheck, deploy.
 * The sitemap and /service-area index pick it up automatically.
 */

export type AreaFaq = {
  question: string;
  answer: string;
};

export type ServiceArea = {
  /** URL slug, e.g. "north-fort-worth" -> /service-area/north-fort-worth */
  slug: string;
  /** Display name, e.g. "North Fort Worth" */
  name: string;
  state: string;
  /** Primary ZIP for the area */
  zip: string;
  county: string;
  /** One-line descriptor used in cards and indexes */
  tagline: string;
  /** Two unique intro paragraphs for the page hero */
  intro: [string, string];
  /** Area-specific bullets: why this community fits the model */
  localNotes: string[];
  /** 5 FAQs: 3 shared service facts + 2 written uniquely for the area */
  faqs: [AreaFaq, AreaFaq, AreaFaq, AreaFaq, AreaFaq];
  metaDescription: string;
};

/** Shared factual FAQs — identical across areas (service facts, not copy). */
const SHARED_FAQS: [AreaFaq, AreaFaq, AreaFaq] = [
  {
    question: "How does City2Ranch's scheduled route work?",
    answer:
      "Instead of on-demand delivery, City2Ranch runs scheduled rural routes on a recurring weekly basis. You submit your shopping list or errand request, our concierge shops in Fort Worth, and everything arrives at your property during your preferred delivery window. Customers on the same route share dependable, scheduled access.",
  },
  {
    question: "What stores do you shop at?",
    answer:
      "We shop wherever you would shop if you drove into Fort Worth yourself — grocery stores, hardware and farm supply stores, pharmacies, pet supply stores, and restaurants for takeout. Tell us what you need and we'll handle the city-side shopping, including multiple stops when needed.",
  },
  {
    question: "How is pricing determined?",
    answer:
      "Pricing is customized according to distance, service requirements, and route availability. Scheduled route service is the most economical option; personal concierge and private estate tiers are available for greater flexibility and dedicated service. Request service and we'll quote your specific needs.",
  },
];

const FIRST_AREAS: ServiceArea[] = [
  {
    slug: "north-fort-worth",
    name: "North Fort Worth",
    state: "TX",
    zip: "76131",
    county: "Tarrant County",
    tagline: "Our launch zone — where City2Ranch began.",
    intro: [
      "North Fort Worth's 76131 corridor is where City2Ranch started. The Alliance area has grown at a remarkable pace — new neighborhoods rising right alongside working ranches, horse properties, and acreage that still feels like open country. It is the perfect illustration of our model: the conveniences of Fort Worth are only minutes away, yet everyday errands still eat up hours when you live on the rural edge of the metroplex.",
      "We run our first scheduled rural routes right here. Our concierge shops in Fort Worth — groceries, hardware, pharmacy runs, specialty stores — and delivers everything to your door on a recurring weekly schedule. If you are in 76131 or the surrounding communities, you are in our launch zone, and founding members here help shape where each new route goes next.",
    ],
    localNotes: [
      "76131 sits at the heart of the Alliance corridor, where rapid development meets legacy ranch land — the exact customer profile City2Ranch was built for.",
      "Texas Motor Speedway and the AllianceTown Center area mean world-class shopping is close, but still a real drive from the acreage properties north of the corridor.",
      "Many properties here sit on 1–5+ acres with room for horses, workshops, and hobby farms — households with serious recurring supply needs.",
      "As our launch zone, North Fort Worth routes get first priority for new recurring schedules.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "I'm in ZIP code 76131 — am I in the service area?",
        answer:
          "Yes. 76131 is our launch zone and the first area where scheduled routes are being established. Enter your ZIP on our service-area page to confirm and join a route, or request private service for immediate needs.",
      },
      {
        question: "Do you serve the Alliance and Speedway area?",
        answer:
          "Yes — the Alliance corridor, including the areas around Texas Motor Speedway and AllianceTown Center, is core to our North Fort Worth routes. If your property is on acreage north or west of the corridor, you're exactly who the scheduled route model was designed for.",
      },
    ],
    metaDescription:
      "City2Ranch brings private rural concierge shopping and delivery to North Fort Worth, TX 76131 — groceries, essentials & errands on a scheduled weekly route.",
  },
  {
    slug: "haslet",
    name: "Haslet",
    state: "TX",
    zip: "76052",
    county: "Tarrant County",
    tagline: "Horse country on Fort Worth's doorstep.",
    intro: [
      "Haslet is horse country. Turnkey horse properties on 3–5 acres, cross-fenced pastures, barns, arenas, and livestock of every kind — all just minutes from the Fort Worth city limits. It is one of the purest examples of the City2Ranch customer: rural by lifestyle and by zoning, yet close enough to town that the weekly grocery and supply run feels like it should be easy. It never is — not when the truck is hooked to the trailer, or the arena needs dragging, or there are simply better uses for a Saturday.",
      "Our concierge shops in Fort Worth and delivers to Haslet on a scheduled weekly route — groceries, feed-store pickups, hardware, pharmacy, and the household essentials that keep a working property running. You stay with your horses; we handle the city.",
    ],
    localNotes: [
      "Haslet's 76052 is known for horse properties and small acreage ranches where horses, cattle, goats, and chickens are welcome — properties with constant recurring supply needs.",
      "Northwest ISD families moved here for land and schools, trading short commutes for long errand drives into Fort Worth.",
      "The Alliance shopping corridor is convenient but still a dedicated trip from most Haslet acreage — exactly the drive our scheduled routes eliminate.",
      "Feed, tack, and ranch-supply pickups pair naturally with weekly grocery routes for horse-property households.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "Can you pick up feed and ranch supplies in Haslet?",
        answer:
          "Yes. Ranch and horse-property households are a core part of our Haslet routes — feed-store runs, hardware, and farm supply pickups can ride along with your weekly grocery and essentials delivery. Tell us what your property needs and we'll build it into your recurring schedule.",
      },
      {
        question: "I'm between Haslet and Fort Worth — which route am I on?",
        answer:
          "The Haslet and North Fort Worth (76131) routes overlap by design, since many customers live along the corridor between them. Enter your ZIP code on our service-area page and we'll place you on the route with the best schedule for your property.",
      },
    ],
    metaDescription:
      "Private concierge shopping & delivery for Haslet, TX horse properties and acreage — groceries, feed-store runs & essentials delivered on a weekly route.",
  },
  {
    slug: "justin",
    name: "Justin",
    state: "TX",
    zip: "76247",
    county: "Denton County",
    tagline: "A historic ranch town, served weekly.",
    intro: [
      "Justin's motto is \u201ceverything a hometown should be,\u201d and it earns it — a historic railroad and ranching town in Denton County where agricultural roots still show. Wheat, cattle, and the Santa Fe railroad built this community, and today its far reaches are all big lots: residents commonly hold 3–5 acres, with some properties running to 50. It is a rural community first, even as the metroplex grows toward it.",
      "That rural character is exactly why City2Ranch serves Justin. The town has heart, but a full grocery run, a hardware trip, or a pharmacy stop means driving toward Fort Worth or Denton — time that adds up fast for working households. Our scheduled weekly route brings Fort Worth's shopping to Justin's doorsteps instead.",
    ],
    localNotes: [
      "Justin (76247) grew from Santa Fe railroad and ranching heritage — its identity is agricultural, and its outskirts remain genuinely rural with multi-acre properties.",
      "Many residents commute toward Fort Worth or Denton for work, making a separate errand drive on top of the commute a real burden.",
      "Northwest ISD growth has brought new families seeking land — the same families with the longest weekly shopping lists.",
      "Properties from 3-acre homesteads to 50-acre spreads all share one trait: recurring supply runs that a scheduled route handles better than ad-hoc trips.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "Do you deliver to rural addresses outside Justin proper?",
        answer:
          "Yes — the far reaches of Justin, where the 3–50 acre properties are, are exactly who we serve. Our routes are built for rural addresses, not just in-town ones. Share your address when you request service and we'll confirm your route placement.",
      },
      {
        question: "Can I get restaurant takeout from Fort Worth delivered to Justin?",
        answer:
          "Yes. Restaurant and takeout is one of our most-requested services for Justin households — enjoy Fort Worth restaurants without making the drive into the city. Add takeout requests to your weekly route order.",
      },
    ],
    metaDescription:
      "City2Ranch delivers Fort Worth shopping to Justin, TX — groceries, hardware & takeout for ranch-town households on a dependable weekly route.",
  },
];
const SECOND_AREAS: ServiceArea[] = [
  {
    slug: "ponder",
    name: "Ponder",
    state: "TX",
    zip: "76259",
    county: "Denton County",
    tagline: "Small-town Texas, on the weekly route.",
    intro: [
      "Ponder is a small rural agricultural community in western Denton County — about 3,200 people, a historic Santa Fe railroad town that was once the commercial center for the ranches and farms of the area. That heritage still defines it: agriculture, close-knit community, and a slower pace that residents chose on purpose. The tradeoff is distance — the nearest full-service shopping means a 20+ minute drive toward Denton or the Fort Worth side.",
      "City2Ranch exists for towns exactly like Ponder. Our concierge shops in Fort Worth and delivers to Ponder on a scheduled weekly route, so a small town keeps its character without its residents spending their weekends in a checkout line two towns over. Groceries, essentials, hardware, pharmacy, and special requests — handled on your schedule.",
    ],
    localNotes: [
      "Ponder (76259) is a genuinely rural community of ~3,200 where agriculture remains a primary local industry — not a suburb with a rural label.",
      "Residents describe the appeal as peace, quiet, and community — and the drawback as the 20-minute drive to anything beyond basics.",
      "The town's ranching and farming heritage means many households manage land, animals, or both, with recurring supply needs.",
      "Scheduled weekly routes are ideal for Ponder: predictable, dependable, and shared among neighbors on the same corridor.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "Is Ponder too small or too far for delivery?",
        answer:
          "No — small and rural is our specialty. Ponder is served by scheduled weekly routes shared with neighboring communities along the same corridor, which is what makes dependable rural service economical. If you're in 76259, enter your ZIP to confirm your route.",
      },
      {
        question: "What if I only need delivery every other week?",
        answer:
          "That's common for Ponder households, and scheduled routes accommodate it. You can set a recurring every-other-week schedule, or submit requests as needed and we'll fit them to the next route day. Flexibility is built into the model.",
      },
    ],
    metaDescription:
      "Rural concierge & grocery delivery for Ponder, TX — City2Ranch brings Fort Worth shopping to small-town Denton County on a scheduled weekly route.",
  },
  {
    slug: "argyle",
    name: "Argyle",
    state: "TX",
    zip: "76226",
    county: "Denton County",
    tagline: "Equestrian estates, white-glove service.",
    intro: [
      "Argyle is equestrian estate country — gated horse farms, 5–15 acre properties with barns and arenas, and some of the finest equine facilities in North Texas. It is refined rural living: manicured grounds, serious horse operations, and households where the property itself is a full-time management job. For these households, City2Ranch isn't just convenient — it is the private staff they didn't have to hire.",
      "Our estate concierge tier was designed with Argyle in mind. A dedicated concierge relationship handles recurring household shopping, guest supplies, property essentials, and special requests — shopped in Fort Worth and delivered on your schedule. Discreet, dependable, and built around how estate households actually live.",
    ],
    localNotes: [
      "Argyle (76226) is known for luxury equestrian estates and horse farms — 5+ acre properties where premium service expectations match premium property values.",
      "Estate households juggle guest turnover, property staff needs, and constant provisioning — the recurring-supply profile our estate tier serves best.",
      "Award-winning Argyle ISD draws families who chose land over proximity, accepting longer drives as the price of space.",
      "Privacy and discretion matter here; our private service model fits gated-community expectations.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "Do you offer a dedicated estate service for Argyle properties?",
        answer:
          "Yes. Our Private Estate Concierge tier is built for high-value households like Argyle's equestrian estates — a dedicated concierge relationship covering recurring household needs, guest supplies, property essentials, and custom arrangements. Request a consultation to design your service.",
      },
      {
        question: "Can you handle guest-house and event provisioning?",
        answer:
          "Absolutely. Stocking guest houses, provisioning for gatherings, and recurring entertaining supplies are common estate requests. Tell your concierge the cadence and we'll keep the property ready without you lifting a finger.",
      },
    ],
    metaDescription:
      "Estate concierge & delivery for Argyle, TX equestrian properties — private shopping, guest provisioning & essentials from Fort Worth, on your schedule.",
  },
  {
    slug: "westlake",
    name: "Westlake",
    state: "TX",
    zip: "76262",
    county: "Tarrant County",
    tagline: "Estate-scale living, concierge-grade service.",
    intro: [
      "Westlake is one of the most exclusive addresses in North Texas — guard-gated communities like Vaquero, estate homes on 1–5+ acre lots, and a standard of privacy and service that few places in the state can match. Households here are accustomed to concierge-grade everything. City2Ranch meets that standard for the weekly realities of estate life: provisioning, essentials, and the endless small errands that come with running a large property.",
      "Our private concierge and estate tiers serve Westlake households with the discretion the community expects. We shop Fort Worth's best — groceries, specialty foods, household essentials, gifts, and guest supplies — and deliver on a schedule built around you. It is the convenience of the city, delivered with the privacy of the estate.",
    ],
    localNotes: [
      "Westlake (76262) is defined by estate-scale properties in guard-gated communities — households where service quality expectations are the highest in the market.",
      "Large properties with guest houses, staff, and frequent entertaining create constant recurring provisioning needs.",
      "Privacy is paramount; our personal, discreet service model aligns with gated-community norms.",
      "Carroll ISD and the Westlake address attract executives and principals who value time above all — the core City2Ranch value proposition.",
    ],
    faqs: [
      ...SHARED_FAQS,
      {
        question: "How do you handle gated-community access in Westlake?",
        answer:
          "Discreetly and professionally. Provide your gate procedures when you set up service and our concierge follows them exactly — many of our estate clients arrange recurring access so deliveries arrive without a phone call each time.",
      },
      {
        question: "Is there a minimum order or commitment?",
        answer:
          "No minimum order. Scheduled route service works on a recurring basis you choose; private concierge and estate tiers are customized to your household. Pricing reflects distance, requirements, and route availability — request a consultation for your specific situation.",
      },
    ],
    metaDescription:
      "Private concierge shopping & delivery for Westlake, TX estates — discreet Fort Worth provisioning for guard-gated communities, on your schedule.",
  },
];

/** All launch areas, in display order. */
export const SERVICE_AREAS: ServiceArea[] = [...FIRST_AREAS, ...SECOND_AREAS];

export function getServiceArea(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((area) => area.slug === slug);
}

export function getServiceAreaSlugs(): string[] {
  return SERVICE_AREAS.map((area) => area.slug);
}
