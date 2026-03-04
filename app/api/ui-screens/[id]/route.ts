import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateUiScreenInput } from "@/database/screens/types";

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
        `SELECT screen_id, screen_name, screen_description
         FROM ui_screens WHERE screen_id = $1`,
        [id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Screen not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen GET error:", err);
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
    const body: UpdateUiScreenInput = await request.json();

    const updates: string[] = [];
    const values: unknown[] = [];
    let pos = 1;

    if (body.screen_name !== undefined) {
      updates.push(`screen_name = $${pos++}`);
      values.push(body.screen_name.trim());
    }
    if (body.screen_description !== undefined) {
      updates.push(`screen_description = $${pos++}`);
      values.push(body.screen_description?.trim() || null);
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
        `UPDATE ui_screens SET ${updates.join(", ")} WHERE screen_id = $${pos}
         RETURNING screen_id, screen_name, screen_description`,
        values
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Screen not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen PATCH error:", err);
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
        `DELETE FROM ui_screens WHERE screen_id = $1 RETURNING screen_id`,
        [id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Screen not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
