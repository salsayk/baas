import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
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
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract milestones DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

