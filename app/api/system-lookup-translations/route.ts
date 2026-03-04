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

    const client = getDbClient();
    await client.connect();
    try {
      if (lookupTableId && languageId) {
        const ltId = Number(lookupTableId);
        const langId = Number(languageId);
        if (!Number.isInteger(ltId) || ltId < 1 || !Number.isInteger(langId) || langId < 1) {
          return NextResponse.json(
            { error: "lookup_table_id and language_id must be positive integers" },
            { status: 400 }
          );
        }
        const res = await client.query(
          `SELECT slt.lookup_table_id, slt.language_id, slt.name, slt.description,
                  sl.lookup_table_name AS base_name, sl.lookup_table_description AS base_description
           FROM system_lookup_translations slt
           JOIN system_lookups sl ON sl.lookup_table_id = slt.lookup_table_id
           WHERE slt.lookup_table_id = $1 AND slt.language_id = $2`,
          [ltId, langId]
        );
        return NextResponse.json(res.rows[0] ?? null);
      }

      if (languageId) {
        const langId = Number(languageId);
        if (!Number.isInteger(langId) || langId < 1) {
          return NextResponse.json(
            { error: "language_id must be a positive integer" },
            { status: 400 }
          );
        }
        const res = await client.query(
          `SELECT slt.lookup_table_id, slt.language_id, slt.name, slt.description,
                  sl.lookup_table_name AS base_name, sl.lookup_table_description AS base_description
           FROM system_lookup_translations slt
           JOIN system_lookups sl ON sl.lookup_table_id = slt.lookup_table_id
           WHERE slt.language_id = $1
           ORDER BY sl.lookup_table_name`,
          [langId]
        );
        return NextResponse.json(res.rows);
      }

      if (lookupTableId) {
        const ltId = Number(lookupTableId);
        if (!Number.isInteger(ltId) || ltId < 1) {
          return NextResponse.json(
            { error: "lookup_table_id must be a positive integer" },
            { status: 400 }
          );
        }
        const res = await client.query(
          `SELECT slt.lookup_table_id, slt.language_id, slt.name, slt.description,
                  l.language_name
           FROM system_lookup_translations slt
           JOIN languages l ON l.id = slt.language_id
           WHERE slt.lookup_table_id = $1
           ORDER BY l.language_name`,
          [ltId]
        );
        return NextResponse.json(res.rows);
      }

      return NextResponse.json(
        { error: "Provide lookup_table_id and/or language_id" },
        { status: 400 }
      );
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup translations GET error:", err);
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
    const lookupTableId = Number(body.lookup_table_id);
    const languageId = Number(body.language_id);
    const name = String(body.name ?? "").trim();
    const description = body.description !== undefined ? String(body.description).trim() || null : null;

    if (!Number.isInteger(lookupTableId) || lookupTableId < 1) {
      return NextResponse.json({ error: "lookup_table_id must be a positive integer" }, { status: 400 });
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
        `INSERT INTO system_lookup_translations (lookup_table_id, language_id, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (lookup_table_id, language_id)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING lookup_table_id, language_id, name, description`,
        [lookupTableId, languageId, name, description]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup translations POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
