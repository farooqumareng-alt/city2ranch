-- Same defense-in-depth caveat as every other RLS migration in this
-- project: the app's own Drizzle connection uses a privileged
-- DATABASE_URL that never authenticates as "authenticated" or "anon",
-- so these policies gate PostgREST/Studio access, not the running app
-- itself — real enforcement (requireSuperAdmin() on every write,
-- publishedAt-filtered queries on every public read) is in
-- src/lib/actions/blog-management.ts and src/lib/blog.ts.
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Same shape as every other staff_all policy in this schema — any
-- active staff member gets full access via the Data API, even though
-- the app's own action layer restricts writes to a super admin
-- specifically (same relationship as staff_all on "drivers", which any
-- staff member can read via this policy even though only a super admin
-- can manage one through the app).
CREATE POLICY "staff_all" ON "blog_posts" FOR ALL TO "authenticated"
  USING (EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid()));
--> statement-breakpoint

-- The first table in this schema with genuinely public content — every
-- other public marketing page's data is a static TS constant, not a
-- database row. A draft must never be readable outside the admin
-- panel, including via a direct Data API request from someone who
-- isn't staff at all; a published post is meant to be public, so this
-- grants "anon" (a signed-out visitor) too, not just "authenticated".
CREATE POLICY "published_public_select" ON "blog_posts" FOR SELECT TO "anon", "authenticated"
  USING ("status" = 'published');
