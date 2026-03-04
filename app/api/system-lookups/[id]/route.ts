import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateSystemLookupInput } from "@/database/system_lookups/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT lookup_table_id, lookup_table_name, lookup_table_description
         FROM system_lookups WHERE lookup_table_id = $1`,
        [id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Lookup table not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateSystemLookupInput = await request.json();

    const updates: string[] = [];
    const values: unknown[] = [];
    let pos = 1;
    if (body.lookup_table_name !== undefined) {
      updates.push(`lookup_table_name = $${pos++}`);
      values.push(body.lookup_table_name.trim());
    }
    if (body.lookup_table_description !== undefined) {
      updates.push(`lookup_table_description = $${pos++}`);
      values.push(body.lookup_table_description?.trim() || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    values.push(id);

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `UPDATE system_lookups SET ${updates.join(", ")} WHERE lookup_table_id = $${pos}
         RETURNING lookup_table_id, lookup_table_name, lookup_table_description`,
        values
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Lookup table not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM system_lookups WHERE lookup_table_id = $1 RETURNING lookup_table_id`,
        [id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Lookup table not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
