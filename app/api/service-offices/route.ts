import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateServiceOfficeInput } from "@/database/Service_Offices/types";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    const client = getDbClient();
    await client.connect();
    try {
      let res;
      if (accountId) {
        const id = parseInt(accountId, 10);
        if (isNaN(id)) {
          return NextResponse.json({ error: "Invalid account_id" }, { status: 400 });
        }
        res = await client.query(
          `SELECT so.* FROM service_offices so
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE so.account_id = $2 AND so.status != 3
           ORDER BY so.created_at DESC`,
          [user.id, id]
        );
      } else {
        res = await client.query(
          `SELECT so.* FROM service_offices so
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE so.status != 3
           ORDER BY so.created_at DESC`,
          [user.id]
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service offices GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body: CreateServiceOfficeInput = await request.json();
    if (!body.service_office_name?.trim()) {
      return NextResponse.json(
        { error: "Service office name is required" },
        { status: 400 }
      );
    }
    if (body.account_id == null || body.account_id === undefined) {
      return NextResponse.json(
        { error: "Account is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const accountCheck = await client.query(
        "SELECT account_id FROM accounts WHERE account_id = $1 AND user_id = $2 AND status != 3",
        [body.account_id, user.id]
      );
      if (accountCheck.rows.length === 0) {
        return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
      }

      const duplicateCheck = await client.query(
        `SELECT so.service_office_id
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.account_id = $2
           AND so.status != 3
           AND LOWER(TRIM(so.service_office_name)) = LOWER(TRIM($3))
         LIMIT 1`,
        [user.id, body.account_id, body.service_office_name.trim()]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A service office with this name already exists under the selected account" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO service_offices (
          service_office_name, service_office_description, account_id, country, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          body.service_office_name.trim(),
          body.service_office_description ?? null,
          body.account_id,
          body.country ?? null,
          body.status ?? 1,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service offices POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
