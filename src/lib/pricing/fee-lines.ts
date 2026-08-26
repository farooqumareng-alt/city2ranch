export type FeeLine = {
  amountCents: number;
};

/**
 * Sums a Concierge order's staff-entered fee lines into the total that
 * gets snapshotted onto orders.totalCents. Pure — no DB, no formatting —
 * mirrors compute-price.ts's role for City Pickup. There is no automated
 * Concierge pricing; this only ever adds up numbers staff typed in.
 */
export function sumFeeLines(lines: FeeLine[]): number {
  return lines.reduce((sum, line) => sum + line.amountCents, 0);
}
