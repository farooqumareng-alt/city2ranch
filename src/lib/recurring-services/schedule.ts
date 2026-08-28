export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adds `months` calendar months to `date`, clamped to the target
 * month's last real day — the naive `setUTCMonth` approach overflows
 * into the *next* month for a date like Jan 31 (Feb has no 31st, so it
 * rolls to Mar 3 instead of landing on Feb 28/29). A recurring plan
 * anchored on the 31st should keep landing near month-end, not
 * gradually drift forward every time it crosses a short month.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const targetMonthIndex = date.getUTCMonth() + months;

  const result = new Date(date.getTime());
  result.setUTCFullYear(date.getUTCFullYear());
  result.setUTCMonth(targetMonthIndex, 1); // land on the 1st first, so month overflow can't smear into the day-of-month math below

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth));

  return result;
}

/**
 * Pure — like src/lib/orders/status.ts — so the month-end/leap-year
 * edge cases are unit testable without a DB or a real clock. Always
 * advances from the plan's own `nextRunAt`, not from "now": a plan
 * whose cron run was a few minutes (or hours) late should still land on
 * its intended schedule next time, not drift later with every delay.
 */
export function advanceNextRunAt(current: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case "weekly":
      return new Date(current.getTime() + 7 * DAY_MS);
    case "biweekly":
      return new Date(current.getTime() + 14 * DAY_MS);
    case "monthly":
      return addMonthsClamped(current, 1);
  }
}
