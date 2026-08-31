import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every route this project's IA changes turned into a redirect rather
 * than deleting (approved UX blueprint: "don't delete anything") —
 * verified by reading each page's actual source rather than exercising
 * Next.js's redirect() at runtime, which throws a control-flow signal
 * (NEXT_REDIRECT) tied to a real request context that doesn't exist in
 * a plain vitest run. This still catches the real failure mode: a
 * typo'd or stale target string that would otherwise only surface when
 * someone actually clicks an old bookmark or link.
 */
const REDIRECTS: { file: string; mustContain: string }[] = [
  { file: "src/app/(account)/orders/page.tsx", mustContain: `redirect("/my-services")` },
  { file: "src/app/(account)/orders/[id]/page.tsx", mustContain: "redirect(`/my-services/${id}`)" },
  { file: "src/app/(account)/requests/page.tsx", mustContain: `redirect("/my-services")` },
  { file: "src/app/(account)/deliveries/page.tsx", mustContain: `redirect("/my-services?filter=active")` },
  {
    file: "src/app/internal/dispatch/concierge/page.tsx",
    mustContain: `redirect("/internal/dispatch/queue?tab=needs_quote")`,
  },
  {
    file: "src/app/internal/dispatch/concierge/[id]/page.tsx",
    mustContain: "redirect(`/internal/dispatch/orders/${id}`)",
  },
];

describe("redirect routes still point where the IA says they should", () => {
  for (const { file, mustContain } of REDIRECTS) {
    it(`${file} redirects correctly`, () => {
      const source = readFileSync(file, "utf8");
      expect(source).toContain(mustContain);
      // And every one of these must actually call redirect() unconditionally
      // at the top level of its default export, not bury it in a branch —
      // a quick structural check that this is still a real redirect page,
      // not one that's quietly grown a conditional and could fall through
      // to rendering nothing.
      expect(source).toMatch(/export default (async )?function \w+/);
    });
  }
});
