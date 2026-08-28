-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/shopping-lists.ts.

ALTER TABLE "shopping_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shopping_list_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "self_all" ON "shopping_lists" FOR ALL TO "authenticated"
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "staff_all" ON "shopping_lists" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

CREATE POLICY "self_all" ON "shopping_list_items" FOR ALL TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "shopping_lists"
    WHERE "shopping_lists"."id" = "shopping_list_items"."list_id" AND "shopping_lists"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "shopping_list_items" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
