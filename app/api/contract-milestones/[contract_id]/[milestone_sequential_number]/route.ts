import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import {
  getMilestoneAggregateViolation,
  milestoneAggregateViolationMessage,
} from "@/app/lib/contract-milestones-aggregate-validation";
import { getDbClient } from "@/database/accounts/db-client";
import { compactMilestoneSequentialNumbers } from "@/app/lib/contract-milestones-sequencing";
import type { UpdateContractMilestoneInput } from "@/database/contract_milestones_data/types";

interface RouteParams {
  params: Promise<{ contract_id: string; milestone_sequential_number: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { contract_id, milestone_sequential_number } = await params;
    const contractId = parseInt(contract_id, 10);
    const seq = parseInt(milestone_sequential_number, 10);
    if (!Number.isFinite(contractId) || !Number.isFinite(seq)) {
      return NextResponse.json({ error: "Invalid contract id or milestone sequence" }, { status: 400 });
    }

    const body: UpdateContractMilestoneInput = await request.json();
    const allowedKeys: Array<keyof UpdateContractMilestoneInput> = [
      "milestone_criteria",
      "milestone_due_date",
      "milestone_amount",
      "milestone_percentage",
      "progress_status",
      "milestone_condition_met_indicator",
      "progress_status_date",
      "milestone_met_date",
      "progress_status_user_id",
      "milestone_met_mark_user_id",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (updates.milestone_amount != null && !Number.isFinite(Number(updates.milestone_amount))) {
      return NextResponse.json({ error: "milestone_amount must be a number" }, { status: 400 });
    }
    if (updates.milestone_percentage != null) {
      const n = Number(updates.milestone_percentage);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: "milestone_percentage must be between 0 and 100" }, { status: 400 });
      }
    }
    if (
      updates.milestone_condition_met_indicator != null &&
      !Number.isFinite(Number(updates.milestone_condition_met_indicator))
    ) {
      return NextResponse.json({ error: "milestone_condition_met_indicator must be a number" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT m.contract_id
         FROM contract_milestones_data m
         INNER JOIN contracts c ON c.contract_id = m.contract_id
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE m.contract_id = $2
           AND m.milestone_sequential_number = $3`,
        [user.id, contractId, seq]
      );

      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const normalized: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(updates)) {
        if (key === "milestone_criteria") {
          normalized[key] = raw == null ? null : String(raw).trim() || null;
          continue;
        }
        if (
          key === "milestone_amount" ||
          key === "milestone_percentage" ||
          key === "progress_status" ||
          key === "milestone_condition_met_indicator" ||
          key === "progress_status_user_id" ||
          key === "milestone_met_mark_user_id"
        ) {
          normalized[key] = raw == null ? null : Number(raw);
          continue;
        }
        normalized[key] = raw;
      }

      const amountOrPctUpdating =
        Object.prototype.hasOwnProperty.call(normalized, "milestone_amount") ||
        Object.prototype.hasOwnProperty.call(normalized, "milestone_percentage");

      if (amountOrPctUpdating) {
        const curAgg = await client.query(
          `SELECT c.contract_amount_value::float8 AS cap,
                  m.milestone_amount::float8 AS cur_amt,
                  m.milestone_percentage::float8 AS cur_pct
           FROM contract_milestones_data m
           INNER JOIN contracts c ON c.contract_id = m.contract_id
           WHERE m.contract_id = $1 AND m.milestone_sequential_number = $2`,
          [contractId, seq]
        );
        const curRow = curAgg.rows[0] as { cap: number | null; cur_amt: number; cur_pct: number };
        const finalAmt =
          normalized.milestone_amount !== undefined ? Number(normalized.milestone_amount) : Number(curRow.cur_amt);
        const finalPct =
          normalized.milestone_percentage !== undefined
            ? Number(normalized.milestone_percentage)
            : Number(curRow.cur_pct);

        const othersRes = await client.query(
          `SELECT COALESCE(SUM(milestone_amount), 0)::float8 AS sum_amt,
                  COALESCE(SUM(milestone_percentage), 0)::float8 AS sum_pct
           FROM contract_milestones_data
           WHERE contract_id = $1 AND milestone_sequential_number <> $2`,
          [contractId, seq]
        );
        const o = othersRes.rows[0] as { sum_amt: number; sum_pct: number };
        const totalAmt = Number(o.sum_amt) + finalAmt;
        const totalPct = Number(o.sum_pct) + finalPct;
        const violation = getMilestoneAggregateViolation({
          contractAmountValue: curRow.cap,
          totalMilestoneAmount: totalAmt,
          totalMilestonePercentage: totalPct,
        });
        if (violation) {
          return NextResponse.json(
            { error: milestoneAggregateViolationMessage(violation) },
            { status: 400 }
          );
        }
      }

      const setClause = Object.keys(normalized)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(normalized);

      const res = await client.query(
        `UPDATE contract_milestones_data m
         SET ${setClause}
         WHERE m.contract_id = $${values.length + 1}
           AND m.milestone_sequential_number = $${values.length + 2}
         RETURNING m.contract_id,
                   m.milestone_sequential_number,
                   m.milestone_criteria,
                   m.milestone_due_date,
                   m.milestone_amount,
                   m.milestone_percentage,
                   m.progress_status,
                   m.milestone_condition_met_indicator,
                   m.progress_status_date,
                   m.milestone_met_date,
                   m.progress_status_user_id,
                   m.milestone_met_mark_user_id`,
        [...values, contractId, seq]
      );

      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract milestones PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { contract_id, milestone_sequential_number } = await params;
    const contractId = parseInt(contract_id, 10);
    const seq = parseInt(milestone_sequential_number, 10);
    if (!Number.isFinite(contractId) || !Number.isFinite(seq)) {
      return NextResponse.json({ error: "Invalid contract id or milestone sequence" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      await client.query("BEGIN");
      try {
        const res = await client.query(
          `DELETE FROM contract_milestones_data m
           USING contracts c, service_offices so, accounts a
           WHERE m.contract_id = c.contract_id
             AND so.service_office_id = c.service_office_id AND so.status != 3
             AND a.account_id = so.account_id AND a.user_id = $1
             AND m.contract_id = $2
             AND m.milestone_sequential_number = $3
           RETURNING m.contract_id`,
          [user.id, contractId, seq]
        );

        if (res.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
        }

        await compactMilestoneSequentialNumbers(client, contractId);

        const rowsRes = await client.query(
          `SELECT m.contract_id,
                  m.milestone_sequential_number,
                  m.milestone_criteria,
                  m.milestone_due_date,
                  m.milestone_amount,
                  m.milestone_percentage,
                  m.progress_status,
                  m.milestone_condition_met_indicator,
                  m.progress_status_date,
                  m.milestone_met_date,
                  m.progress_status_user_id,
                  m.milestone_met_mark_user_id
           FROM contract_milestones_data m
           WHERE m.contract_id = $1
           ORDER BY m.milestone_sequential_number`,
          [contractId]
        );
        await client.query("COMMIT");
        return NextResponse.json({ success: true, milestones: rowsRes.rows });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract milestones DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

