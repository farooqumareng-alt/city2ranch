-- Private bucket for driver hiring paperwork (license/insurance/
-- registration scans) — object bytes never touch our own Postgres
-- tables; drivers.license_doc_path etc. (see 0046) just hold the path
-- into this bucket. `public = false` means every read needs either a
-- signed URL (src/lib/actions/driver-documents.ts) or an authenticated
-- request that passes the policy below — there is no anonymous access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Same defense-in-depth caveat as every RLS migration in this project:
-- the app's own upload/read calls go through a per-request Supabase
-- client that authenticates as the signed-in staff member (not a
-- privileged bypass), so this policy is the real enforcement for this
-- bucket, not just a PostgREST/Studio backstop. Staff-only, matching
-- every other staff_all policy's shape — driver hiring paperwork is
-- managed by whoever's handling hiring, not self-served by the driver.
-- Object paths are "<driver id>/<kind>.<ext>" (see driver-documents.ts)
-- but nothing here parses the path — any active staff member can manage
-- any driver's documents, same access shape as the Driver Profile page
-- itself (requireSuperAdmin, one level up from plain staff, gates the
-- page and every action that touches this bucket — this policy is a
-- floor under that, not a substitute for it).
CREATE POLICY "staff_all_driver_documents" ON storage.objects FOR ALL TO "authenticated"
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND EXISTS (SELECT 1 FROM "staff" WHERE "staff"."auth_user_id" = auth.uid())
  );
