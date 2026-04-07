import type { Client } from "pg";

/** Large enough to avoid PK clashes while remapping (contract_id, milestone_sequential_number). */
export const MILESTONE_SEQ_REORDER_OFFSET = 1_000_000;

export async function userCanAccessContract(
  client: Client,
  userId: string,
  contractId: number
): Promise<boolean> {
  const r = await client.query(
    `SELECT 1
     FROM contracts c
     INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
     INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
     WHERE c.contract_id = $2`,
    [userId, contractId]
  );
  return r.rows.length > 0;
}

/**
 * Remap milestone_sequential_number to 1..n in current sort order (ascending by seq).
 * No-op when already 1..n contiguous or empty.
 */
export async function compactMilestoneSequentialNumbers(
  client: Client,
  contractId: number
): Promise<void> {
  const rows = await client.query(
    `SELECT milestone_sequential_number
     FROM contract_milestones_data
     WHERE contract_id = $1
     ORDER BY milestone_sequential_number`,
    [contractId]
  );
  const oldSeqs = rows.rows.map((r) => Number(r.milestone_sequential_number));
  if (oldSeqs.length === 0) return;

  const n = oldSeqs.length;
  const alreadyCompact =
    oldSeqs[0] === 1 && oldSeqs[n - 1] === n && oldSeqs.every((s, i) => (i === 0 ? true : s === oldSeqs[i - 1] + 1));
  if (alreadyCompact) return;

  await applySequentialRemap(client, contractId, oldSeqs);
}

/**
 * Reorder milestones: `orderedSequentialNumbers` lists existing seq values in the new order
 * (first element becomes milestone #1). Must be a permutation of current rows.
 */
export async function reorderMilestonesBySequenceList(
  client: Client,
  contractId: number,
  orderedSequentialNumbers: number[]
): Promise<void> {
  const rows = await client.query(
    `SELECT milestone_sequential_number
     FROM contract_milestones_data
     WHERE contract_id = $1
     ORDER BY milestone_sequential_number`,
    [contractId]
  );
  const currentSeqs = rows.rows.map((r) => Number(r.milestone_sequential_number));
  if (currentSeqs.length !== orderedSequentialNumbers.length) {
    throw new Error("REORDER_COUNT_MISMATCH");
  }
  const sortedA = [...currentSeqs].sort((a, b) => a - b);
  const sortedB = [...orderedSequentialNumbers].sort((a, b) => a - b);
  if (sortedA.length !== sortedB.length || sortedA.some((v, i) => v !== sortedB[i])) {
    throw new Error("REORDER_SET_MISMATCH");
  }

  await applySequentialRemap(client, contractId, orderedSequentialNumbers);
}

async function applySequentialRemap(
  client: Client,
  contractId: number,
  orderedOldSeqs: number[]
): Promise<void> {
  const OFFSET = MILESTONE_SEQ_REORDER_OFFSET;
  await client.query(
    `UPDATE contract_milestones_data
     SET milestone_sequential_number = milestone_sequential_number + $2
     WHERE contract_id = $1`,
    [contractId, OFFSET]
  );
  for (let i = 0; i < orderedOldSeqs.length; i++) {
    const newSeq = i + 1;
    const tempSeq = orderedOldSeqs[i] + OFFSET;
    const res = await client.query(
      `UPDATE contract_milestones_data
       SET milestone_sequential_number = $1
       WHERE contract_id = $2 AND milestone_sequential_number = $3`,
      [newSeq, contractId, tempSeq]
    );
    if (res.rowCount === 0) {
      throw new Error("REORDER_ROW_MISSING");
    }
  }
}
