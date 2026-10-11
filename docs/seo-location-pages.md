# SEO Location Pages — Content Brief

Launch: 2026-10-11 · Branch: `seo/week3-location-pages`
Status: 6 launch-area pages built and merged-ready. This doc is the playbook
for maintaining them and launching new areas.

## 1. System overview

- **URL pattern:** `/service-area/[region]` — nested under `/service-area`
  for topical authority and clean internal linking.
- **Data:** `src/data/service-areas.ts` — one `ServiceArea` entry per page.
  Add an entry → page, metadata, sitemap, and index links generate automatically.
- **Template:** `src/components/location/ServiceAreaTemplate.tsx` — shared
  structure (hero/H1, intro, local-fit notes, services recap, how-it-works,
  route card, FAQ, CTAs).
- **Route:** `src/app/service-area/[region]/page.tsx` — `generateStaticParams`
  (static build), `generateMetadata` (unique title/description + canonical +
  OG via `pageSeo`), `notFound()` for unknown slugs.
- **Schema per page:** one JSON-LD `<script>` with `@graph` containing
  `ProfessionalService` (`areaServed` → City + State) and `FAQPage`.
  Follows the escaped-`</` (`\u003c`) pattern from the root layout.
- **Sitemap:** `src/app/sitemap.ts` reads `SERVICE_AREAS` — new areas are
  indexed on the next deploy with zero extra work.
- **Index:** `/service-area` renders a card grid linking to every area page.

## 2. Keyword map

Researched 2026-10-11. Weighted toward Texas / Fort Worth / DFW rural terms.
"Intent" = what the searcher wants; "Target" = where we capture it.

### Commercial intent (ready to buy / book)

| # | Keyword / pattern | Target page |
|---|---|---|
| 1 | rural grocery delivery | /service-area + area pages |
| 2 | grocery delivery Haslet TX / Justin TX / Argyle TX / Ponder TX | matching area page |
| 3 | grocery delivery 76131 / 76052 / 76247 / 76259 / 76226 / 76262 | matching area page |
| 4 | ranch concierge service | /services, area pages |
| 5 | estate concierge DFW / Fort Worth estate concierge | /service-area/westlake, /service-area/argyle |
| 6 | private grocery delivery Fort Worth | /service-area/north-fort-worth |
| 7 | errand service Fort Worth TX | /services |
| 8 | personal shopper Fort Worth | /services |
| 9 | weekly grocery delivery service | /services, area pages |
| 10 | takeout delivery [town] TX / Fort Worth restaurants delivered to Justin | area page FAQs |
| 11 | feed store delivery / ranch supply delivery Texas | /service-area/haslet (horse-property angle) |
| 12 | does instacart deliver to Haslet / Justin / Ponder | area page FAQs (competitor-gap capture) |

### Informational intent (researching → nurture)

| # | Keyword / pattern | Target page |
|---|---|---|
| 13 | how does rural grocery delivery work | /how-it-works, blog |
| 14 | grocery delivery rural areas (food-desert research angle) | blog post |
| 15 | moving to Haslet TX / living in Justin TX / Argyle TX | matching area page |
| 16 | what is a rural concierge service | /about, blog |
| 17 | how much does grocery delivery cost | FAQ/blog |
| 18 | concierge vs delivery app rural | blog |

### Long-tail pattern per area (apply to every new area)

- `[service] in [town], TX` (e.g. "grocery delivery in Ponder TX")
- `[town] TX [service]` (e.g. "Haslet TX concierge")
- `does [service] deliver to [town]` (FAQ capture)
- `[town] TX ZIP code [zip] delivery`

## 3. Per-page copy guidelines (anti-doorway rules)

Google treats near-duplicate location pages as doorway pages. Every area
page MUST satisfy all of these before launch:

1. **Unique intro — 2 paragraphs, 150+ words**, grounded in real,
   verifiable facts about the community (history, character, schools,
   landmarks). Never swap just the town name.
2. **3–4 local notes** that could only be written about this area
   (e.g. Haslet's horse-property zoning, Justin's railroad/ranch heritage,
   Westlake's guard-gated estates).
3. **2 unique FAQs** per area on top of the 3 shared service FAQs.
   Shared FAQs cover facts (how routes work, stores, pricing) — identical
   wording is fine and expected. Marketing prose must not repeat.
4. **Unique meta title + description** per page (<160 chars for description).
   Pattern: `Rural Concierge & Delivery in {Name}, {ST}` + area-specific
   description mentioning the ZIP.
5. **Minimum ~400 words of unique copy per page** (intro + local notes +
   unique FAQs). The template's shared structural sections (services recap,
   how-it-works, route card) bring total page content to 800+ words, but
   only the unique portions count toward this minimum.
6. **Never publish a page for an area with no real presence.** Every live
   area page must correspond to an actual route or an active waitlist.
   Aspirational "coming soon" areas stay OFF the site until they're real.
7. **One H1 per page**, unique, containing `{Area}, {ST}`.
8. **No invented facts.** If you can't verify a local claim (landmark,
   school, ZIP), cut it. See §6 for what to confirm per area.

## 4. Internal linking plan

Implemented:
- `/service-area` → card grid linking to all 6 area pages (descriptive
  anchor text: "{Name}, {ST} {ZIP}").
- Area pages → `/request-service` (2 CTAs), `/service-area` ("Check Your ZIP"),
  `tel:` link; template cross-references `/services` content via the recap.

Recommended next (not yet implemented):
- **Homepage:** add a "Launch areas" strip or footer mention linking to
  `/service-area` (already links) — consider 2–3 featured area links with
  unique anchor text once routes are active.
- **Blog:** every future post about rural living, provisioning, or a
  community should deep-link to the relevant area page(s).
- **Footer:** add a "Service Areas" column with the 6 area links when the
  footer is next revised (sitewide link equity to area pages).
- **Area ↔ area:** link neighboring areas contextually (e.g. Haslet page
  mentions the North Fort Worth route overlap — already in FAQ copy).

## 5. Launch checklist (per new area)

- [ ] Confirm with ops: area name, primary ZIP(s), route status
       (active route vs. waitlist).
- [ ] Gather 2–3 verifiable local facts (see §6).
- [ ] Write entry in `src/data/service-areas.ts`: unique intro (2 paras),
       3–4 local notes, 2 unique FAQs + 3 shared, unique meta description.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` — zero new errors (one pre-existing `LayoutProps`
       error in `src/app/layout.tsx` as of 2026-10-11).
- [ ] `npm run build` succeeds; confirm `/service-area/{slug}` prerenders.
- [ ] Rendered-page QA: exactly one H1, canonical self-references,
       JSON-LD parses (paste into validator.schema.org), FAQ visible.
- [ ] Sitemap includes the new URL (automatic — verify at /sitemap.xml).
- [ ] After deploy: request indexing in Search Console.

## 6. What to confirm per target area (info needed)

To generate a real page for a new area, provide:

1. **Area name + primary ZIP(s)** (e.g. "Roanoke, TX 76262").
2. **Route status:** active scheduled route, or waitlist/developing?
3. **2–3 genuine local facts:** character of the community, notable
   landmarks, schools, or property types (horse properties? estates?
   acreage?). These become the unique intro + local notes.
4. **Service emphasis:** anything area-specific to highlight
   (e.g. feed-store runs for horse country, guest provisioning for estates).
5. **Geo coordinates** (optional, nice-to-have): lat/lng of the town
   center for future `geo` enrichment of the LocalBusiness schema.
6. **Anything NOT to claim:** areas explicitly out of scope, competitor
   sensitivities, or messaging to avoid.

## 7. Current launch areas (2026-10-11)

| Slug | Area | ZIP | Angle |
|---|---|---|---|
| north-fort-worth | North Fort Worth, TX | 76131 | Launch zone / anchor page |
| haslet | Haslet, TX | 76052 | Horse properties & acreage |
| justin | Justin, TX | 76247 | Historic ranch town |
| ponder | Ponder, TX | 76259 | Small rural agricultural community |
| argyle | Argyle, TX | 76226 | Equestrian estates |
| westlake | Westlake, TX | 76262 | Ultra-luxury guard-gated estates |
