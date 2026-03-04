import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateSystemLookupInput } from "@/database/system_lookups/types";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const languageId = searchParams.get("language_id");

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
          `SELECT sl.lookup_table_id,
                  COALESCE(slt.name, sl.lookup_table_name) AS lookup_table_name,
                  COALESCE(slt.description, sl.lookup_table_description) AS lookup_table_description
           FROM system_lookups sl
           LEFT JOIN system_lookup_translations slt
             ON slt.lookup_table_id = sl.lookup_table_id AND slt.language_id = $1
           ORDER BY COALESCE(slt.name, sl.lookup_table_name) ASC`,
          [langId]
        );
      } else {
        res = await client.query(
          `SELECT lookup_table_id, lookup_table_name, lookup_table_description
           FROM system_lookups
           ORDER BY lookup_table_name`
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookups GET error:", err);
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

    const body: CreateSystemLookupInput = await request.json();
    if (!body.lookup_table_name?.trim()) {
      return NextResponse.json(
        { error: "Lookup table name is required" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO system_lookups (lookup_table_name, lookup_table_description)
         VALUES ($1, $2)
         RETURNING lookup_table_id, lookup_table_name, lookup_table_description`,
        [body.lookup_table_name.trim(), body.lookup_table_description?.trim() || null]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookups POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
