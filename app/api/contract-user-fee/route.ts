import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateContractUserFeeInput } from "@/database/contract_user_fee/types";

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
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract_id" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      // Access control: contract must belong to user's accessible service office.
      const rowsRes = await client.query(
        `SELECT f.contract_id,
                f.user_professional_grade,
                f.user_hourly_rate,
                f.user_hourly_rate_discount
         FROM contract_user_fee f
         INNER JOIN contracts c ON c.contract_id = f.contract_id
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE f.contract_id = $2
         ORDER BY f.user_professional_grade`,
        [user.id, contractId]
      );

      // If no fee rows exist, still allow returning empty list (contract may be valid).
      return NextResponse.json(rowsRes.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract user fee GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body: CreateContractUserFeeInput = await request.json();
    if (body.contract_id == null || body.contract_id === undefined) {
      return NextResponse.json({ error: "contract_id is required" }, { status: 400 });
    }
    if (body.user_professional_grade == null || body.user_professional_grade === undefined) {
      return NextResponse.json({ error: "user_professional_grade is required" }, { status: 400 });
    }
    if (body.user_hourly_rate == null || body.user_hourly_rate === undefined) {
      return NextResponse.json({ error: "user_hourly_rate is required" }, { status: 400 });
    }
    if (body.user_hourly_rate_discount == null || body.user_hourly_rate_discount === undefined) {
      return NextResponse.json({ error: "user_hourly_rate_discount is required" }, { status: 400 });
    }

    if (body.user_hourly_rate < 0) {
      return NextResponse.json({ error: "user_hourly_rate must be >= 0" }, { status: 400 });
    }
    if (body.user_hourly_rate_discount < 0 || body.user_hourly_rate_discount > 100) {
      return NextResponse.json({ error: "user_hourly_rate_discount must be between 0 and 100" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      // Access + contract existence.
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

      const duplicateCheck = await client.query(
        `SELECT 1
         FROM contract_user_fee f
         WHERE f.contract_id = $1 AND f.user_professional_grade = $2
         LIMIT 1`,
        [body.contract_id, body.user_professional_grade]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A contract user fee entry for this professional grade already exists" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO contract_user_fee (
            contract_id,
            user_professional_grade,
            user_hourly_rate,
            user_hourly_rate_discount
          )
         VALUES ($1,$2,$3,$4)
         RETURNING contract_id,
                   user_professional_grade,
                   user_hourly_rate,
                   user_hourly_rate_discount`,
        [body.contract_id, body.user_professional_grade, body.user_hourly_rate, body.user_hourly_rate_discount]
      );

      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract user fee POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

