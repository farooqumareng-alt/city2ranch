import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily builds the Drizzle/Neon client. Deliberately does NOT read
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

  const sql = neon(connectionString);
  cached = drizzle(sql, { schema });
  return cached;
}
