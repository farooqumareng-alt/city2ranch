-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Studio access, not the running app itself. Real enforcement
-- is in src/lib/actions/order-messages.ts.

ALTER TABLE "order_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "customer_select_own" ON "order_messages" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "orders"
    WHERE "orders"."id" = "order_messages"."order_id" AND "orders"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "order_messages" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
