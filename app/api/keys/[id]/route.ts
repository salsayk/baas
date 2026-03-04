import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateApiKeyInput } from "@/database/api_keys/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch a single API key by ID (only if it belongs to the authenticated user)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT id, user_id, name, key, type, usage, "limit", created_at
         FROM api_keys
         WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("API key GET error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update an API key (only if it belongs to the authenticated user)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body: UpdateApiKeyInput = await request.json();

    const updates: string[] = [];
    const values: unknown[] = [];
    let pos = 1;
    if (body.name !== undefined) {
      updates.push(`name = $${pos++}`);
      values.push(body.name);
    }
    if (body.type !== undefined) {
      updates.push(`type = $${pos++}`);
      values.push(body.type);
    }
    if (body.limit !== undefined) {
      if (typeof body.limit !== "number" || body.limit < 0) {
        return NextResponse.json(
          { error: "Limit must be a non-negative number" },
          { status: 400 }
        );
      }
      updates.push(`"limit" = $${pos++}`);
      values.push(body.limit);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    values.push(id, user.id);
    const setClause = updates.join(", ");

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `UPDATE api_keys
         SET ${setClause}
         WHERE id = $${pos} AND user_id = $${pos + 1}
         RETURNING id, user_id, name, key, type, usage, "limit", created_at`,
        values
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("API key PATCH error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete an API key (only if it belongs to the authenticated user)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, user.id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("API key DELETE error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
