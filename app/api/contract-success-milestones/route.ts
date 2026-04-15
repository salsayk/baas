import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateContractMilestoneSuccessInput } from "@/database/contract_milestones_data_for_success/types";

function badRequest(field: string, error: string) {
  return NextResponse.json({ error, field }, { status: 400 });
}

function validateByType(body: {
  milestone_type: number;
  milestone_amount: number | null;
  milestone_percentage: number | null;
  milestone_percentage_reference_figure: number | null;
  milestone_percentage_reference_figure_description: string | null;
}): { field: string; error: string } | null {
  if (body.milestone_type === 0) {
    if (body.milestone_amount == null || !Number.isFinite(Number(body.milestone_amount))) {
      return {
        field: "milestone_amount",
        error: "milestone_amount is required when milestone_type is Fixed",
      };
    }
    return null;
  }
  if (body.milestone_type === 1) {
    if (body.milestone_percentage == null || !Number.isFinite(Number(body.milestone_percentage))) {
      return {
        field: "milestone_percentage",
        error: "milestone_percentage is required when milestone_type is Percentage",
      };
    }
    if (Number(body.milestone_percentage) < 0 || Number(body.milestone_percentage) > 100) {
      return { field: "milestone_percentage", error: "milestone_percentage must be between 0 and 100" };
    }
    if (
      body.milestone_percentage_reference_figure == null ||
      !Number.isFinite(Number(body.milestone_percentage_reference_figure))
    ) {
      return {
        field: "milestone_percentage_reference_figure",
        error: "milestone_percentage_reference_figure is required when milestone_type is Percentage",
      };
    }
    if (!body.milestone_percentage_reference_figure_description?.trim()) {
      return {
        field: "milestone_percentage_reference_figure_description",
        error: "milestone_percentage_reference_figure_description is required when milestone_type is Percentage",
      };
    }
    return null;
  }
  return { field: "milestone_type", error: "milestone_type must be 0 (Fixed) or 1 (Percentage)" };
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contractIdRaw = searchParams.get("contract_id");
    if (!contractIdRaw) return NextResponse.json({ error: "contract_id is required" }, { status: 400 });
    const contractId = parseInt(contractIdRaw, 10);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      return NextResponse.json({ error: "Invalid contract_id" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const rowsRes = await client.query(
        `SELECT m.*
         FROM contract_milestones_data_for_success m
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
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body: CreateContractMilestoneSuccessInput = await request.json();
    if (body.contract_id == null || body.contract_id <= 0) {
      return badRequest("contract_id", "contract_id is required");
    }
    if (!body.milestone_criteria?.trim()) {
      return badRequest("milestone_criteria", "milestone_criteria is required");
    }
    if (body.milestone_type == null || !Number.isFinite(Number(body.milestone_type))) {
      return badRequest("milestone_type", "milestone_type is required");
    }

    const normalized = {
      milestone_type: Number(body.milestone_type),
      milestone_amount:
        body.milestone_type === 1
          ? null
          : body.milestone_amount == null
            ? null
            : Number(body.milestone_amount),
      milestone_percentage:
        body.milestone_type === 0
          ? null
          : body.milestone_percentage == null
            ? null
            : Number(body.milestone_percentage),
      milestone_percentage_reference_figure:
        body.milestone_type === 0
          ? null
          : body.milestone_percentage_reference_figure == null
            ? null
            : Number(body.milestone_percentage_reference_figure),
      milestone_percentage_reference_figure_description:
        body.milestone_type === 0
          ? null
          : body.milestone_percentage_reference_figure_description?.trim() || null,
    };
    const typeError = validateByType(normalized);
    if (typeError) return badRequest(typeError.field, typeError.error);

    if (body.min_payment_amount != null && !Number.isFinite(Number(body.min_payment_amount))) {
      return badRequest("min_payment_amount", "min_payment_amount must be a number");
    }
    if (body.max_payment_amount != null && !Number.isFinite(Number(body.max_payment_amount))) {
      return badRequest("max_payment_amount", "max_payment_amount must be a number");
    }
    if (
      body.min_payment_amount != null &&
      body.max_payment_amount != null &&
      Number(body.min_payment_amount) > Number(body.max_payment_amount)
    ) {
      return badRequest("max_payment_amount", "max_payment_amount must be >= min_payment_amount");
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

      const seq =
        body.milestone_sequential_number != null &&
        Number.isFinite(Number(body.milestone_sequential_number)) &&
        Number(body.milestone_sequential_number) > 0
          ? Number(body.milestone_sequential_number)
          : null;

      const res = await client.query(
        `INSERT INTO contract_milestones_data_for_success (
            contract_id, milestone_sequential_number, milestone_criteria, milestone_due_date,
            milestone_type, milestone_amount, milestone_percentage,
            milestone_percentage_reference_figure, milestone_percentage_reference_figure_description,
            min_payment_amount, max_payment_amount, progress_status,
            milestone_condition_met_indicator, progress_status_date, milestone_met_date,
            progress_status_user_id, milestone_met_mark_user_id
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          Number(body.contract_id),
          seq,
          body.milestone_criteria.trim(),
          body.milestone_due_date || null,
          normalized.milestone_type,
          normalized.milestone_amount,
          normalized.milestone_percentage,
          normalized.milestone_percentage_reference_figure,
          normalized.milestone_percentage_reference_figure_description,
          body.min_payment_amount == null ? null : Number(body.min_payment_amount),
          body.max_payment_amount == null ? null : Number(body.max_payment_amount),
          body.progress_status == null ? 0 : Number(body.progress_status),
          body.milestone_condition_met_indicator == null ? 0 : Number(body.milestone_condition_met_indicator),
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
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

