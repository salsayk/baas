import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import {
  getMilestoneAggregateViolation,
  milestoneAggregateViolationMessage,
} from "@/app/lib/contract-milestones-aggregate-validation";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateContractMilestoneInput } from "@/database/contract_milestones_data/types";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contractIdRaw = searchParams.get("contract_id");
    if (!contractIdRaw) {
      return NextResponse.json({ error: "contract_id is required" }, { status: 400 });
    }
    const contractId = parseInt(contractIdRaw, 10);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      return NextResponse.json({ error: "Invalid contract_id" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
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
         INNER JOIN contracts c ON c.contract_id = m.contract_id
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE m.contract_id = $2
         ORDER BY m.milestone_sequential_number`,
        [user.id, contractId]
      );

      return NextResponse.json(rowsRes.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract milestones GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body: CreateContractMilestoneInput = await request.json();
    if (body.contract_id == null || body.contract_id <= 0) {
      return NextResponse.json({ error: "contract_id is required" }, { status: 400 });
    }
    if (body.milestone_amount == null || !Number.isFinite(Number(body.milestone_amount))) {
      return NextResponse.json({ error: "milestone_amount is required" }, { status: 400 });
    }
    if (body.milestone_percentage == null || !Number.isFinite(Number(body.milestone_percentage))) {
      return NextResponse.json({ error: "milestone_percentage is required" }, { status: 400 });
    }
    if (Number(body.milestone_percentage) < 0 || Number(body.milestone_percentage) > 100) {
      return NextResponse.json({ error: "milestone_percentage must be between 0 and 100" }, { status: 400 });
    }
    if (
      body.milestone_condition_met_indicator == null ||
      !Number.isFinite(Number(body.milestone_condition_met_indicator))
    ) {
      return NextResponse.json({ error: "milestone_condition_met_indicator is required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const contractCheck = await client.query(
        `SELECT c.contract_id
         FROM contracts c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.contract_id = $2`,
        [user.id, body.contract_id]
      );
      if (contractCheck.rows.length === 0) {
        return NextResponse.json({ error: "Contract not found or access denied" }, { status: 404 });
      }

      const aggRes = await client.query(
        `SELECT c.contract_amount_value::float8 AS cap,
                COALESCE(SUM(m.milestone_amount), 0)::float8 AS sum_amt,
                COALESCE(SUM(m.milestone_percentage), 0)::float8 AS sum_pct
         FROM contracts c
         LEFT JOIN contract_milestones_data m ON m.contract_id = c.contract_id
         WHERE c.contract_id = $1
         GROUP BY c.contract_id, c.contract_amount_value`,
        [body.contract_id]
      );
      const aggRow = aggRes.rows[0] as { cap: number | null; sum_amt: number; sum_pct: number };
      const newAmt = Number(body.milestone_amount);
      const newPct = Number(body.milestone_percentage);
      const totalAmt = Number(aggRow.sum_amt) + newAmt;
      const totalPct = Number(aggRow.sum_pct) + newPct;
      const violation = getMilestoneAggregateViolation({
        contractAmountValue: aggRow.cap,
        totalMilestoneAmount: totalAmt,
        totalMilestonePercentage: totalPct,
      });
      if (violation) {
        return NextResponse.json({ error: milestoneAggregateViolationMessage(violation) }, { status: 400 });
      }

      const seq =
        body.milestone_sequential_number != null &&
        Number.isFinite(Number(body.milestone_sequential_number)) &&
        Number(body.milestone_sequential_number) > 0
          ? Number(body.milestone_sequential_number)
          : null;

      const res = await client.query(
        `INSERT INTO contract_milestones_data (
            contract_id,
            milestone_sequential_number,
            milestone_criteria,
            milestone_due_date,
            milestone_amount,
            milestone_percentage,
            progress_status,
            milestone_condition_met_indicator,
            progress_status_date,
            milestone_met_date,
            progress_status_user_id,
            milestone_met_mark_user_id
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING contract_id,
                   milestone_sequential_number,
                   milestone_criteria,
                   milestone_due_date,
                   milestone_amount,
                   milestone_percentage,
                   progress_status,
                   milestone_condition_met_indicator,
                   progress_status_date,
                   milestone_met_date,
                   progress_status_user_id,
                   milestone_met_mark_user_id`,
        [
          Number(body.contract_id),
          seq,
          body.milestone_criteria?.trim() ? body.milestone_criteria.trim() : null,
          body.milestone_due_date || null,
          Number(body.milestone_amount),
          Number(body.milestone_percentage),
          body.progress_status == null ? 0 : Number(body.progress_status),
          Number(body.milestone_condition_met_indicator),
          body.progress_status_date || null,
          body.milestone_met_date || null,
          body.progress_status_user_id == null ? null : Number(body.progress_status_user_id),
          body.milestone_met_mark_user_id == null ? null : Number(body.milestone_met_mark_user_id),
        ]
      );

      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract milestones POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

