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
  // a direct connection too. `max: 1` matters just as much: each
  // serverless function instance should hold at most one connection —
  // postgres-js's default (10) multiplied across however many concurrent
  // instances Vercel spins up is exactly what exhausted Supabase's
  // pooler connection cap in production (EMAXCONNSESSION). The pooler
  // itself is what multiplexes many of these single connections
  // together; the app doesn't need its own pool on top of that.
  const client = postgres(connectionString, { prepare: false, max: 1 });
  cached = drizzle(client, { schema });
  return cached;
}
