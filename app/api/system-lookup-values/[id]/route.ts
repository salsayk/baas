import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateSystemLookupValueInput } from "@/database/system_lookup_values/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateSystemLookupValueInput = await request.json();

    const updates: string[] = [];
    const values: unknown[] = [];
    let pos = 1;
    if (body.value_id !== undefined) {
      updates.push(`value_id = $${pos++}`);
      values.push(body.value_id);
    }
    if (body.value_name !== undefined) {
      updates.push(`value_name = $${pos++}`);
      values.push(body.value_name.trim());
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
        `UPDATE system_lookup_values SET ${updates.join(", ")} WHERE id = $${pos}
         RETURNING id, lookup_table_id, value_id, value_name`,
        values
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Lookup value not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23505") {
        return NextResponse.json(
          { error: "A value with this value_id already exists for this lookup table." },
          { status: 400 }
        );
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup value PATCH error:", err);
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
        `DELETE FROM system_lookup_values WHERE id = $1 RETURNING id`,
        [id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Lookup value not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("System lookup value DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
