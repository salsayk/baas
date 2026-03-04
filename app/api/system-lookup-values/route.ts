import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateSystemLookupValueInput } from "@/database/system_lookup_values/types";

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
    if (!lookupTableId) {
      return NextResponse.json(
        { error: "lookup_table_id is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      let res;
      if (languageId) {
        const langId = Number(languageId);
        if (!Number.isInteger(langId) || langId < 1) {
          return NextResponse.json(
            { error: "language_id must be a positive integer" },
            { status: 400 }
          );
        }
        res = await client.query(
          `SELECT v.id, v.lookup_table_id, v.value_id,
                  COALESCE(t.value_name, v.value_name) AS value_name,
                  v.value_name AS base_value_name
           FROM system_lookup_values v
           LEFT JOIN system_lookup_value_translations t
             ON t.system_lookup_value_id = v.id AND t.language_id = $1
           WHERE v.lookup_table_id = $2
           ORDER BY v.value_id`,
          [langId, lookupTableId]
        );
      } else {
        res = await client.query(
          `SELECT id, lookup_table_id, value_id, value_name
           FROM system_lookup_values
           WHERE lookup_table_id = $1
           ORDER BY value_id`,
          [lookupTableId]
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup values GET error:", err);
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

    const body: CreateSystemLookupValueInput = await request.json();
    if (
      body.lookup_table_id == null ||
      body.value_id == null ||
      !body.value_name?.trim()
    ) {
      return NextResponse.json(
        { error: "lookup_table_id, value_id, and value_name are required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO system_lookup_values (lookup_table_id, value_id, value_name)
         VALUES ($1, $2, $3)
         RETURNING id, lookup_table_id, value_id, value_name`,
        [body.lookup_table_id, body.value_id, body.value_name.trim()]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23505") {
        return NextResponse.json(
          { error: "A value with this value_id already exists for this lookup table." },
          { status: 400 }
        );
      }
      if (pgErr?.code === "23503") {
        return NextResponse.json(
          { error: "Lookup table not found." },
          { status: 400 }
        );
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup values POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
