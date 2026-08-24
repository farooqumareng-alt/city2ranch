# City2Ranch

Private Rural Concierge & Delivery — City Convenience. Ranch Delivered.

Phase 1 marketing site: Next.js (App Router) + TypeScript + Tailwind CSS, with
Drizzle/Neon Postgres + Resend powering the site's lead-capture forms.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL / RESEND_API_KEY to enable forms
npm run dev
```

Without real `DATABASE_URL` / `RESEND_API_KEY` values, forms validate
normally but submission responds with an explicit "temporarily unavailable"
message rather than a fake success — see `src/lib/env.ts`.

## Database

Schema lives in `src/lib/db/schema.ts`. Once `DATABASE_URL` points at a real
Postgres (e.g. [Neon](https://neon.tech)) database:

```bash
npx drizzle-kit generate   # create a migration from the schema
npx drizzle-kit migrate    # apply it
```

## Project structure

- `src/app/` — routes (Home, Services, How It Works, Service Area, Request
  Service, About, Contact, Privacy, Terms) plus the `/api/zip-check` route
  handler and SEO file conventions (`sitemap.ts`, `robots.ts`, `icon.tsx`).
- `src/components/ui/` — design-system primitives (Button, Card,
  SectionHeading, FormField, …).
- `src/components/layout/` — Nav, Footer, mobile menu, sticky mobile CTA.
- `src/components/home/` — Home page sections.
- `src/components/forms/` — client form components, each backed by a
  server action in `src/lib/actions/`.
- `src/lib/db/`, `src/lib/email/`, `src/lib/validation/` — data layer,
  email notifications, and shared Zod schemas.
- `src/lib/zip-coverage.ts` — the actual list of ZIP codes City2Ranch
  serves today (starts empty by design — see the comment in the file).
