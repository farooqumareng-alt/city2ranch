import { existsSync } from "node:fs";
import type { Config } from "drizzle-kit";

// The drizzle-kit CLI (unlike `next dev`) doesn't load `.env.local` on its
// own — load it here so `npx drizzle-kit generate/migrate` just works.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
