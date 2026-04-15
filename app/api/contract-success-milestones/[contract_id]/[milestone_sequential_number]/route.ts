import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import { compactSuccessMilestoneSequentialNumbers } from "@/app/lib/contract-success-milestones-sequencing";
import type { UpdateContractMilestoneSuccessInput } from "@/database/contract_milestones_data_for_success/types";

interface RouteParams {
  params: Promise<{ contract_id: string; milestone_sequential_number: string }>;
}

function badRequest(field: string, error: string) {
  return NextResponse.json({ error, field }, { status: 400 });
}

function validateAndNormalizeByType(
  finalState: Record<string, unknown>,
  updates: Record<string, unknown>
): { field: string; error: string } | null {
  const type = Number(finalState.milestone_type);
  if (!Number.isFinite(type) || (type !== 0 && type !== 1)) {
    return { field: "milestone_type", error: "milestone_type must be 0 (Fixed) or 1 (Percentage)" };
  }
  if (type === 0) {
    const amount = finalState.milestone_amount == null ? null : Number(finalState.milestone_amount);
    if (amount == null || !Number.isFinite(amount)) {
      return { field: "milestone_amount", error: "milestone_amount is required when milestone_type is Fixed" };
    }
    updates.milestone_percentage = null;
    updates.milestone_percentage_reference_figure = null;
    updates.milestone_percentage_reference_figure_description = null;
    return null;
  }

  const pct = finalState.milestone_percentage == null ? null : Number(finalState.milestone_percentage);
  if (pct == null || !Number.isFinite(pct)) {
    return { field: "milestone_percentage", error: "milestone_percentage is required when milestone_type is Percentage" };
  }
  if (pct < 0 || pct > 100) {
    return { field: "milestone_percentage", error: "milestone_percentage must be between 0 and 100" };
  }
  const ref = finalState.milestone_percentage_reference_figure == null ? null : Number(finalState.milestone_percentage_reference_figure);
  if (ref == null || !Number.isFinite(ref)) {
    return {
      field: "milestone_percentage_reference_figure",
      error: "milestone_percentage_reference_figure is required when milestone_type is Percentage",
    };
  }
  const desc = String(finalState.milestone_percentage_reference_figure_description ?? "").trim();
  if (!desc) {
    return {
      field: "milestone_percentage_reference_figure_description",
      error: "milestone_percentage_reference_figure_description is required when milestone_type is Percentage",
    };
  }
  updates.milestone_amount = null;
  updates.milestone_percentage = pct;
  updates.milestone_percentage_reference_figure = ref;
  updates.milestone_percentage_reference_figure_description = desc;
  return null;
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

    const body: UpdateContractMilestoneSuccessInput = await request.json();
    const allowed: Array<keyof UpdateContractMilestoneSuccessInput> = [
      "milestone_criteria",
      "milestone_due_date",
      "milestone_type",
      "milestone_amount",
      "milestone_percentage",
      "milestone_percentage_reference_figure",
      "milestone_percentage_reference_figure_description",
      "min_payment_amount",
      "max_payment_amount",
      "progress_status",
      "milestone_condition_met_indicator",
      "progress_status_date",
      "milestone_met_date",
      "progress_status_user_id",
      "milestone_met_mark_user_id",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return badRequest("form", "No valid fields to update");
    }

    if (updates.milestone_criteria !== undefined) {
      const crit = String(updates.milestone_criteria ?? "").trim();
      if (!crit) return badRequest("milestone_criteria", "milestone_criteria is required");
      updates.milestone_criteria = crit;
    }
    if (updates.milestone_percentage !== undefined && updates.milestone_percentage != null) {
      const n = Number(updates.milestone_percentage);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return badRequest("milestone_percentage", "milestone_percentage must be between 0 and 100");
      }
      updates.milestone_percentage = n;
    }
    if (updates.min_payment_amount !== undefined && updates.min_payment_amount != null) {
      const n = Number(updates.min_payment_amount);
      if (!Number.isFinite(n)) return badRequest("min_payment_amount", "min_payment_amount must be a number");
      updates.min_payment_amount = n;
    }
    if (updates.max_payment_amount !== undefined && updates.max_payment_amount != null) {
      const n = Number(updates.max_payment_amount);
      if (!Number.isFinite(n)) return badRequest("max_payment_amount", "max_payment_amount must be a number");
      updates.max_payment_amount = n;
    }
    if (
      updates.min_payment_amount != null &&
      updates.max_payment_amount != null &&
      Number(updates.min_payment_amount) > Number(updates.max_payment_amount)
    ) {
      return badRequest("max_payment_amount", "max_payment_amount must be >= min_payment_amount");
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT m.*
         FROM contract_milestones_data_for_success m
         INNER JOIN contracts c ON c.contract_id = m.contract_id
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE m.contract_id = $2 AND m.milestone_sequential_number = $3`,
        [user.id, contractId, seq]
      );
      if (currentRes.rows.length === 0) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

      const current = currentRes.rows[0] as Record<string, unknown>;
      const finalState: Record<string, unknown> = { ...current, ...updates };
      const typeError = validateAndNormalizeByType(finalState, updates);
      if (typeError) return badRequest(typeError.field, typeError.error);

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE contract_milestones_data_for_success
         SET ${setClause}
         WHERE contract_id = $${values.length + 1} AND milestone_sequential_number = $${values.length + 2}
         RETURNING *`,
        [...values, contractId, seq]
      );
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
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
          `DELETE FROM contract_milestones_data_for_success m
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
        await compactSuccessMilestoneSequentialNumbers(client, contractId);
        const rowsRes = await client.query(
          `SELECT *
           FROM contract_milestones_data_for_success
           WHERE contract_id = $1
           ORDER BY milestone_sequential_number`,
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
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

