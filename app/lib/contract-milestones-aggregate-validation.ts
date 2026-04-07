/** Tolerance for numeric comparisons (amounts / percentages). */
export const MILESTONE_AGG_EPS = 1e-6;

export interface MilestoneLike {
  contract_id: number | unknown;
  milestone_sequential_number: number | unknown;
  milestone_amount: number | unknown;
  milestone_percentage: number | unknown;
}

/**
 * Sums amounts/percentages for all milestones, replacing one row when editing with new values.
 */
export function computeTotalsAfterMilestoneChange(
  milestones: MilestoneLike[],
  editing: { contract_id: number; milestone_sequential_number: number } | null,
  newAmount: number,
  newPct: number
): { totalAmount: number; totalPct: number } {
  let totalAmount = 0;
  let totalPct = 0;
  for (const m of milestones) {
    if (
      editing != null &&
      Number(m.contract_id) === Number(editing.contract_id) &&
      Number(m.milestone_sequential_number) === Number(editing.milestone_sequential_number)
    ) {
      continue;
    }
    totalAmount += Number(m.milestone_amount);
    totalPct += Number(m.milestone_percentage);
  }
  totalAmount += newAmount;
  totalPct += newPct;
  return { totalAmount, totalPct };
}

export type MilestoneAggregateViolation =
  | { kind: "amount"; cap: number; totalAmount: number }
  | { kind: "percent"; totalPct: number };

/**
 * Returns a violation when sum of milestone amounts exceeds contract cap (if cap is set &gt; 0)
 * or sum of percentages exceeds 100.
 */
export function getMilestoneAggregateViolation(params: {
  contractAmountValue: number | null | undefined;
  totalMilestoneAmount: number;
  totalMilestonePercentage: number;
}): MilestoneAggregateViolation | null {
  const { contractAmountValue, totalMilestoneAmount, totalMilestonePercentage } = params;

  const cap =
    contractAmountValue != null &&
    Number.isFinite(Number(contractAmountValue)) &&
    Number(contractAmountValue) > 0
      ? Number(contractAmountValue)
      : null;

  if (cap != null && totalMilestoneAmount > cap + MILESTONE_AGG_EPS) {
    return { kind: "amount", cap, totalAmount: totalMilestoneAmount };
  }

  if (totalMilestonePercentage > 100 + MILESTONE_AGG_EPS) {
    return { kind: "percent", totalPct: totalMilestonePercentage };
  }

  return null;
}

/** API / server: single English sentence with numbers. */
export function milestoneAggregateViolationMessage(v: MilestoneAggregateViolation): string {
  if (v.kind === "amount") {
    return `Total milestone amounts cannot exceed the contract amount (${v.cap.toFixed(2)}). Current sum would be ${v.totalAmount.toFixed(2)}.`;
  }
  return `Total milestone percentages cannot exceed 100%. Current sum would be ${v.totalPct.toFixed(2)}%.`;
}
