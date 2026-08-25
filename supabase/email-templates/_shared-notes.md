# Supabase Auth email templates

These are **not** sent through our Resend integration
(`src/lib/email/templates.ts`) — they're Supabase Auth's own built-in
emails (account confirmation, magic-link sign-in), sent by Supabase's
mailer and configured entirely in the Supabase Dashboard, not in this
codebase. Kept here as version-controlled source-of-truth for what's
pasted into the dashboard, since nothing else records it.

## Where to paste these

Supabase Dashboard → your project → **Authentication → Emails**
(older dashboards: **Authentication → Email Templates**):

- `confirm-signup.html` → the **Confirm signup** template
- `magic-link.html` → the **Magic Link** template

Paste the full HTML into the template's source/code view for each.
Leave the **Subject heading** field as-is or set it to match the
`<title>` in each file — the `{{ .ConfirmationURL }}` placeholder must
stay exactly as-is; Supabase substitutes it at send time.

## Fixing "clicking Confirm does nothing"

That symptom is almost always a URL Configuration mismatch, not the
template. Check **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` for local dev (swap to the
  real production domain once deployed — Supabase only supports one
  Site URL at a time, so this needs to change again at launch).
- **Redirect URLs**: must include `http://localhost:3000/auth/callback`
  (a wildcard like `http://localhost:3000/**` also works). Our sign-in
  flow (`SignInForm.tsx`) passes `emailRedirectTo` explicitly, but
  Supabase silently refuses to honor any redirect target that isn't in
  this allow-list — it falls back to the Site URL instead, which is
  what produces the "click it, nothing happens / lands somewhere odd"
  symptom.

Once deployed, add the production callback URL (e.g.
`https://city2ranch.com/auth/callback`) to the same allow-list
alongside the localhost one — both can coexist.
