import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get("screen_id");
    const languageId = searchParams.get("language_id");

    if (!screenId || !languageId) {
      return NextResponse.json(
        { error: "screen_id and language_id are required" },
        { status: 400 }
      );
    }

    const scrId = Number(screenId);
    const langId = Number(languageId);
    if (!Number.isInteger(scrId) || scrId < 1 || !Number.isInteger(langId) || langId < 1) {
      return NextResponse.json(
        { error: "screen_id and language_id must be positive integers" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT ust.screen_id, ust.language_id, ust.name, ust.description,
                us.screen_name AS base_name, us.screen_description AS base_description
         FROM ui_screen_translations ust
         JOIN ui_screens us ON us.screen_id = ust.screen_id
         WHERE ust.screen_id = $1::bigint
           AND EXISTS (
             SELECT 1
             FROM languages ul
             WHERE ul.id = ust.language_id
               AND ul.language_name = (SELECT language_name FROM languages WHERE id = $2::bigint LIMIT 1)
           )
         LIMIT 1`,
        [scrId, langId]
      );
      return NextResponse.json(res.rows[0] ?? null);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen translations GET error:", err);
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

    const body = await request.json();
    const screenId = Number(body.screen_id);
    const languageId = Number(body.language_id);
    const name = String(body.name ?? "").trim();
    const description = body.description !== undefined ? String(body.description).trim() || null : null;

    if (!Number.isInteger(screenId) || screenId < 1) {
      return NextResponse.json({ error: "screen_id must be a positive integer" }, { status: 400 });
    }
    if (!Number.isInteger(languageId) || languageId < 1) {
      return NextResponse.json({ error: "language_id must be a positive integer" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO ui_screen_translations (screen_id, language_id, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (screen_id, language_id)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING screen_id, language_id, name, description`,
        [screenId, languageId, name, description]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen translations POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
