import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateServiceOfficeInput } from "@/database/Service_Offices/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT so.* FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.service_office_id = $2 AND so.status != 3`,
        [user.id, officeId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const body: UpdateServiceOfficeInput = await request.json();
    const allowedKeys = [
      "service_office_name",
      "service_office_description",
      "country",
      "status",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key] ?? null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    if (typeof updates.service_office_name === "string") {
      updates.service_office_name = updates.service_office_name.trim();
      if (!updates.service_office_name) {
        return NextResponse.json({ error: "Service office name cannot be empty" }, { status: 400 });
      }
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT so.account_id, so.service_office_name
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.service_office_id = $2 AND so.status != 3`,
        [user.id, officeId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }

      const current = currentRes.rows[0];
      const nextName =
        typeof updates.service_office_name === "string"
          ? updates.service_office_name
          : current.service_office_name;

      const duplicateCheck = await client.query(
        `SELECT so.service_office_id
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.account_id = $2
           AND so.service_office_id <> $3
           AND so.status != 3
           AND LOWER(TRIM(so.service_office_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, current.account_id, officeId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A service office with this name already exists under this account" },
          { status: 409 }
        );
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE service_offices so SET ${setClause}
         FROM accounts a
         WHERE a.account_id = so.account_id AND a.user_id = $${values.length + 1}
         AND so.service_office_id = $${values.length + 2} AND so.status != 3
         RETURNING so.*`,
        [...values, user.id, officeId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `UPDATE service_offices so SET status = 3
         FROM accounts a
         WHERE a.account_id = so.account_id AND a.user_id = $1
         AND so.service_office_id = $2 AND so.status != 3
         RETURNING so.service_office_id`,
        [user.id, officeId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
