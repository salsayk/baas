import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateApiKeyInput } from "@/database/api_keys/types";

// GET - Fetch all API keys for the authenticated user
export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT id, user_id, name, key, type, usage, "limit", created_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [user.id]
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("API keys GET error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create a new API key for the authenticated user
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      );
    }

    const body: CreateApiKeyInput = await request.json();

    if (!body.name || !body.key || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: name, key, type" },
        { status: 400 }
      );
    }

    const limit = body.limit ?? 1000;
    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO api_keys (user_id, name, key, type, usage, "limit")
         VALUES ($1, $2, $3, $4, 0, $5)
         RETURNING id, user_id, name, key, type, usage, "limit", created_at`,
        [user.id, body.name, body.key.trim(), body.type, limit]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23505") {
        return NextResponse.json(
          { error: "An API key with this value already exists." },
          { status: 400 }
        );
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("API keys POST error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
