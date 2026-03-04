import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateAccountInput } from "@/database/accounts/types";

export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        "SELECT * FROM accounts WHERE user_id = $1 AND status != 3 ORDER BY created_at DESC",
        [user.id]
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Accounts GET error:", err);
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

    const body: CreateAccountInput = await request.json();
    if (!body.account_name?.trim()) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO accounts (
          user_id,
          account_name, mobile_phone, secondary_phone, email_address,
          card_holder_name, card_number, card_expiry_month, card_expiry_year, card_last_four, card_cvv,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          user.id,
          body.account_name.trim(),
          body.mobile_phone ?? null,
          body.secondary_phone ?? null,
          body.email_address ?? null,
          body.card_holder_name ?? null,
          body.card_number ?? null,
          body.card_expiry_month ?? null,
          body.card_expiry_year ?? null,
          body.card_last_four ?? null,
          body.card_cvv ?? null,
          body.status ?? 1,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Accounts POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
