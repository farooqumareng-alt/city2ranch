import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily builds the Drizzle/Postgres client (works with any standard
 * Postgres provider — currently Supabase). Deliberately does NOT read
 * `DATABASE_URL` at module load time — server actions call this inside
 * their own try/catch so a missing/invalid connection string degrades to
 * the "service temporarily unavailable" response instead of crashing the
 * build or the whole request.
 */
export function getDb() {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  // `prepare: false` is required for connection poolers run in transaction
  // mode (e.g. Supabase's Supavisor pooler on port 6543); harmless against
  // a direct connection too.
  //
  // `max`: postgres-js's default (10) per serverless instance, multiplied
  // across however many concurrent instances Vercel spins up, is what
  // exhausted the pooler in session mode (EMAXCONNSESSION). But `max: 1`
  // has a real cost of its own under transaction mode: a page that fires
  // several genuinely-independent queries via Promise.all (e.g. the
  // account dashboard, /request-service's prefill data) can't actually
  // run them concurrently with only one physical connection — they
  // serialize through it, and each round trip to the pooler costs real
  // cross-region latency. Transaction mode's whole design is multiplexing
  // many short-lived client connections onto a shared backend pool (unlike
  // session mode's one-dedicated-backend-connection-per-session), so a
  // small per-instance max here is safe headroom, not a repeat of the
  // session-mode problem.
  const client = postgres(connectionString, { prepare: false, max: 5 });
  cached = drizzle(client, { schema });
  return cached;
}
