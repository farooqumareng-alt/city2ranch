/**
 * Every send site this app has today that's both recurring and has a
 * known owner at send time — see the doc comment on
 * notificationPreferences in src/lib/db/schema.ts for why this is the
 * only category (the other transactional emails in this codebase fire
 * before there's a resolvable owner to key a preference off of).
 */
export type NotificationCategory = "paymentReceipts";

export type NotificationPreferencesRow = { paymentReceipts: boolean } | undefined;

/**
 * The actual decision, pulled out as its own DB-free module (like
 * src/lib/orders/status.ts and src/lib/household-roles.ts) so it's unit
 * testable without vitest needing @/lib/db's path-alias resolution.
 *
 * A *missing* row (undefined) means "send" (all-true default, see the
 * schema doc comment) — the row only exists once someone has actually
 * visited /notifications and possibly changed something.
 */
export function resolveNotifyDecision(
  row: NotificationPreferencesRow,
  category: NotificationCategory
): boolean {
  if (!row) return true;
  switch (category) {
    case "paymentReceipts":
      return row.paymentReceipts;
  }
}
