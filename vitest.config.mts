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
});
