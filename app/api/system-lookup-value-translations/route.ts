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
    const lookupTableId = searchParams.get("lookup_table_id");
    const languageId = searchParams.get("language_id");

    if (!lookupTableId || !languageId) {
      return NextResponse.json(
        { error: "lookup_table_id and language_id are required" },
        { status: 400 }
      );
    }

    const ltId = Number(lookupTableId);
    const langId = Number(languageId);
    if (!Number.isInteger(ltId) || ltId < 1 || !Number.isInteger(langId) || langId < 1) {
      return NextResponse.json(
        { error: "lookup_table_id and language_id must be positive integers" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT v.id AS system_lookup_value_id, v.lookup_table_id, v.value_id,
                COALESCE(t.value_name, v.value_name) AS value_name,
                v.value_name AS base_value_name
         FROM system_lookup_values v
         LEFT JOIN system_lookup_value_translations t
           ON t.system_lookup_value_id = v.id AND t.language_id = $1
         WHERE v.lookup_table_id = $2
         ORDER BY v.value_id`,
        [langId, ltId]
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup value translations GET error:", err);
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
    const systemLookupValueId = Number(body.system_lookup_value_id);
    const languageId = Number(body.language_id);
    const valueName = String(body.value_name ?? "").trim();

    if (!Number.isInteger(systemLookupValueId) || systemLookupValueId < 1) {
      return NextResponse.json({ error: "system_lookup_value_id must be a positive integer" }, { status: 400 });
    }
    if (!Number.isInteger(languageId) || languageId < 1) {
      return NextResponse.json({ error: "language_id must be a positive integer" }, { status: 400 });
    }
    if (!valueName) {
      return NextResponse.json({ error: "value_name is required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO system_lookup_value_translations (system_lookup_value_id, language_id, value_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (system_lookup_value_id, language_id)
         DO UPDATE SET value_name = EXCLUDED.value_name
         RETURNING system_lookup_value_id, language_id, value_name`,
        [systemLookupValueId, languageId, valueName]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup value translations POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
