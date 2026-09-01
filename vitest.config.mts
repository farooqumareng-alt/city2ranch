import { defineConfig } from "vitest/config";
import path from "node:path";

const dirname = import.meta.dirname;

// Mirrors tsconfig.json's "@/*" -> "./src/*" mapping. Vitest (Vite)
// doesn't read tsconfig `paths` on its own — until this file existed,
// every `@/...` import inside a *.test.ts file failed to resolve, which
// is why the handful of pure-logic modules (household-roles.ts,
// orders/status.ts) were deliberately kept DB-free: it was the only way
// to unit test them at all. That constraint is now fixed, not worked
// around — new tests can import real `@/lib/...` modules directly.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    // There are now three test files that open their own live
    // connection straight to the shared Supabase pooler (transaction
    // mode) — rls-security, lifecycle-integration, business-overview.
    // Run concurrently (vitest's default), they intermittently produced
    // "prepared statement does not exist" errors from pooler contention
    // between separate `postgres` connections — a real, reproducible
    // side effect of the pool, not a bug in any one file (each passes
    // 100% of the time run alone). Running test *files* sequentially
    // costs a few seconds on this small a suite and removes the
    // flakiness at the source, rather than papering over it with
    // retries.
    fileParallelism: false,
  },
});
