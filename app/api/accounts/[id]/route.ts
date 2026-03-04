import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateAccountInput } from "@/database/accounts/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        "SELECT * FROM accounts WHERE account_id = $1 AND user_id = $2 AND status != 3",
        [accountId, user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Account GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const body: UpdateAccountInput = await request.json();
    const allowedKeys = [
      "account_name",
      "mobile_phone",
      "secondary_phone",
      "email_address",
      "card_holder_name",
      "card_number",
      "card_expiry_month",
      "card_expiry_year",
      "card_last_four",
      "card_cvv",
      "status",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key] ?? null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE accounts SET ${setClause} WHERE account_id = $${values.length + 1} AND user_id = $${values.length + 2} AND status != 3 RETURNING *`,
        [...values, accountId, user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Account PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        "UPDATE accounts SET status = 3 WHERE account_id = $1 AND user_id = $2 AND status != 3 RETURNING account_id",
        [accountId, user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Account DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
