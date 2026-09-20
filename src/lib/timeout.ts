/**
 * Wraps a promise with a timeout, resolving to `fallback` instead of
 * hanging forever if it doesn't settle in time. Added 2026-09-20 after
 * a real incident investigation: src/proxy.ts (runs on every request)
 * and getCurrentUser() (src/lib/supabase/server.ts, runs on every
 * staff/driver/customer-gated page) both called Supabase's
 * auth.getUser() with no timeout — a transient Supabase Auth hiccup
 * would hang the request until Vercel's own function timeout killed
 * the connection, which a browser shows as a hard "page couldn't
 * load" failure, with nothing logged since the platform cuts the
 * connection before the app finishes. A slow auth check should
 * degrade (treated as unauthenticated, same as a real signed-out
 * visitor) rather than take the whole request down with it.
 *
 * Deliberately narrow: only guards against never settling. A genuine
 * rejection from `promise` still rejects normally if it happens before
 * the timeout — this never swallows a real error, only a hang.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
