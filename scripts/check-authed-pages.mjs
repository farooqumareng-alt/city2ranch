// Verifies real pages actually render for a signed-in user — not just
// that a sign-in gate redirects when signed out. Signs in with one of
// the test accounts (see TEST_ACCOUNT_PASSWORD below; accounts created
// via Supabase's admin API — see the project's "proactive test
// accounts" memory), then feeds the resulting tokens through
// @supabase/ssr's own cookie serialization (createServerClient with a
// captured in-memory cookie jar) so the cookies sent are byte-for-byte
// what a real browser sign-in would produce — no hand-rolled guessing
// at the chunking/base64-/storageKey format.
//
// Usage:
//   node scripts/check-authed-pages.mjs [email] [baseUrl] [path...]
//   node scripts/check-authed-pages.mjs                                    # test-customer, prod, default account pages
//   node scripts/check-authed-pages.mjs test-staff@city2ranch.test https://www.city2ranch.com /internal/dispatch
//
// On Windows Git Bash, leading-slash path arguments get silently
// mangled into Windows paths (MSYS path conversion) — prefix the
// command with MSYS_NO_PATHCONV=1 when passing explicit paths.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2];
}

const email = process.argv[2] ?? "test-customer@city2ranch.test";
const password = process.env.TEST_ACCOUNT_PASSWORD;
const baseUrl = process.argv[3] ?? "https://www.city2ranch.com";

if (!password) {
  console.error("Set TEST_ACCOUNT_PASSWORD in .env.local first.");
  process.exit(1);
}

const plain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: signInData, error: signInError } = await plain.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error("Sign-in failed:", signInError);
  process.exit(1);
}

const capturedCookies = new Map();
const ssrClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll() {
      return [...capturedCookies.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) capturedCookies.set(name, value);
    },
  },
});
await ssrClient.auth.setSession({
  access_token: signInData.session.access_token,
  refresh_token: signInData.session.refresh_token,
});

const cookieHeader = [...capturedCookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

const defaultPaths = [
  "/home",
  "/orders",
  "/deliveries",
  "/places",
  "/payments",
  "/requests",
  "/lists",
  "/household",
  "/membership",
  "/support",
  "/profile",
];
const paths = process.argv.slice(4).length > 0 ? process.argv.slice(4) : defaultPaths;

for (const path of paths) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  });
  console.log(`${path}: status=${res.status}`);
}
