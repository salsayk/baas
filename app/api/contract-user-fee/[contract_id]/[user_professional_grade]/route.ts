import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateContractUserFeeInput } from "@/database/contract_user_fee/types";

interface RouteParams {
  params: Promise<{ contract_id: string; user_professional_grade: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { contract_id, user_professional_grade } = await params;
    const contractId = parseInt(contract_id, 10);
    const gradeId = parseInt(user_professional_grade, 10);
    if (isNaN(contractId) || isNaN(gradeId)) {
      return NextResponse.json({ error: "Invalid contract id or professional grade" }, { status: 400 });
    }

    const body: UpdateContractUserFeeInput = await request.json();
    const allowedKeys: Array<keyof UpdateContractUserFeeInput> = ["user_hourly_rate", "user_hourly_rate_discount"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (updates.user_hourly_rate != null) {
      const n = Number(updates.user_hourly_rate);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "user_hourly_rate must be >= 0" }, { status: 400 });
      }
    }
    if (updates.user_hourly_rate_discount != null) {
      const n = Number(updates.user_hourly_rate_discount);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: "user_hourly_rate_discount must be between 0 and 100" }, { status: 400 });
      }
    }

    // access + record existence
    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT f.contract_id
         FROM contract_user_fee f
         INNER JOIN contracts c ON c.contract_id = f.contract_id
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE f.contract_id = $2 AND f.user_professional_grade = $3`,
        [user.id, contractId, gradeId]
      );

      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Contract user fee entry not found" }, { status: 404 });
      }

      // Normalize values
      const normalized: Record<string, unknown> = {};
      if (updates.user_hourly_rate !== undefined) {
        normalized.user_hourly_rate = Number(updates.user_hourly_rate);
      }
      if (updates.user_hourly_rate_discount !== undefined) {
        normalized.user_hourly_rate_discount = Number(updates.user_hourly_rate_discount);
      }

      const setClause = Object.keys(normalized)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(normalized);

      const res = await client.query(
        `UPDATE contract_user_fee f SET ${setClause}
         WHERE f.contract_id = $${values.length + 1}
           AND f.user_professional_grade = $${values.length + 2}
         RETURNING f.*`,
        [...values, contractId, gradeId]
      );

      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract user fee PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { contract_id, user_professional_grade } = await params;
    const contractId = parseInt(contract_id, 10);
    const gradeId = parseInt(user_professional_grade, 10);
    if (isNaN(contractId) || isNaN(gradeId)) {
      return NextResponse.json({ error: "Invalid contract id or professional grade" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM contract_user_fee f
         USING contracts c, service_offices so, accounts a
         WHERE f.contract_id = c.contract_id
           AND so.service_office_id = c.service_office_id AND so.status != 3
           AND a.account_id = so.account_id AND a.user_id = $1
           AND f.contract_id = $2
           AND f.user_professional_grade = $3
         RETURNING f.contract_id`,
        [user.id, contractId, gradeId]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Contract user fee entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract user fee DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

