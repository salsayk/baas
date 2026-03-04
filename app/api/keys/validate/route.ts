import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

// POST - Validate an API key (only validates keys belonging to the authenticated user)
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) {
      return NextResponse.json(
        { valid: false, error: "Unauthorized. Please sign in to validate API keys." },
        { status: 401 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { valid: false, error: "Unauthorized. Please sign in to validate API keys." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const apiKey = body.apiKey;
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT id, name, type FROM api_keys WHERE key = $1 AND user_id = $2`,
        [apiKey.trim(), user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ valid: false, error: "Invalid API key" });
      }
      const row = res.rows[0];
      return NextResponse.json({
        valid: true,
        keyInfo: {
          id: row.id,
          name: row.name,
          type: row.type,
        },
      });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Validate API key error:", err);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
