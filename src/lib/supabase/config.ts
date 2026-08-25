// NEXT_PUBLIC_* vars are inlined at build time and are safe to read
// directly in both client and server code (unlike DATABASE_URL /
// RESEND_API_KEY, which are read lazily server-side only).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
