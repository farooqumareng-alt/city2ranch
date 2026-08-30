import type { NextConfig } from "next";

// The Supabase project URL the browser client talks to directly (auth
// token refresh, any client-side PostgREST calls) — connect-src has to
// allow it or those requests silently fail under CSP. Read the same
// way src/lib/supabase/config.ts does: NEXT_PUBLIC_* vars are inlined
// at build time and safe to reference here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Security remediation, 2026-08-30: this app previously shipped with no
// security headers at all. This is intentionally the conservative half
// of what the framework's own docs recommend — a nonce-based CSP would
// be stricter, but it requires forcing every page in the app to
// dynamic rendering (disabling static generation/ISR entirely) and
// can't be verified without a real browser, which wasn't available
// while writing this. Widen a specific directive if something breaks;
// that's a much smaller risk than a wrong nonce-based rollout no one
// could test.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' ${supabaseUrl};
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://checkout.stripe.com;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Only meaningful once served over HTTPS (true in production
          // on Vercel) — harmless on a plain HTTP local dev server,
          // where browsers ignore it.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
