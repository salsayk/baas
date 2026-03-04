import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateUiScreenInput } from "@/database/screens/types";

export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT screen_id, screen_name, screen_description
         FROM ui_screens
         ORDER BY screen_name`
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screens GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body: CreateUiScreenInput = await request.json();
    if (!body.screen_name?.trim()) {
      return NextResponse.json(
        { error: "Screen name is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO ui_screens (screen_name, screen_description)
         VALUES ($1, $2)
         RETURNING screen_id, screen_name, screen_description`,
        [body.screen_name.trim(), body.screen_description?.trim() || null]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screens POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
