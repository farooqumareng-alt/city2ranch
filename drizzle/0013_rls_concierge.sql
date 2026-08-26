-- Same defense-in-depth caveat as every existing RLS migration in this
-- project: the app's Drizzle connection uses a privileged DATABASE_URL
-- that never authenticates as `authenticated`, so these policies gate
-- PostgREST/Supabase Studio access, not the running app itself. Real
-- enforcement is requireStaff()/ownership checks inside server actions.

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_fee_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Customers may read (never write) their own order's items/fee lines —
-- the order-detail page shows the shopping list and quote to the
-- customer who owns the order. Written via EXISTS against orders rather
-- than a direct auth_user_id column on these tables, since neither has
-- one (both are pure children of orders).
CREATE POLICY "customer_select_own" ON "order_items" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "orders"
    WHERE "orders"."id" = "order_items"."order_id" AND "orders"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint
CREATE POLICY "customer_select_own" ON "order_fee_lines" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "orders"
    WHERE "orders"."id" = "order_fee_lines"."order_id" AND "orders"."auth_user_id" = auth.uid()
  ));
--> statement-breakpoint

CREATE POLICY "staff_all" ON "order_items" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "staff_all" ON "order_fee_lines" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
