import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateSubcontractorInput } from "@/database/subcontractors/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { id } = await params;
    const subcontractorId = parseInt(id, 10);
    if (isNaN(subcontractorId)) {
      return NextResponse.json({ error: "Invalid subcontractor ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT s.* FROM subcontractors s
         INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE s.subcontractor_id = $2`,
        [user.id, subcontractorId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Subcontractor GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { id } = await params;
    const subcontractorId = parseInt(id, 10);
    if (isNaN(subcontractorId)) {
      return NextResponse.json({ error: "Invalid subcontractor ID" }, { status: 400 });
    }

    const body: UpdateSubcontractorInput = await request.json();
    const allowedKeys = [
      "subcontractor_name",
      "status",
      "contact_person_name",
      "contact_person_phone",
      "contact_person_email",
      "contact_person_address",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key] ?? null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (typeof updates.subcontractor_name === "string") {
      updates.subcontractor_name = updates.subcontractor_name.trim();
      if (!updates.subcontractor_name) {
        return NextResponse.json({ error: "Subcontractor name cannot be empty" }, { status: 400 });
      }
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT s.service_office_id, s.subcontractor_name
         FROM subcontractors s
         INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE s.subcontractor_id = $2`,
        [user.id, subcontractorId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
      }
      const current = currentRes.rows[0];
      const nextName =
        typeof updates.subcontractor_name === "string"
          ? updates.subcontractor_name
          : current.subcontractor_name;

      const duplicateCheck = await client.query(
        `SELECT s.subcontractor_id
         FROM subcontractors s
         INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE s.service_office_id = $2
           AND s.subcontractor_id <> $3
           AND s.status != 3
           AND LOWER(TRIM(s.subcontractor_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, current.service_office_id, subcontractorId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A subcontractor with this name already exists under this service office" },
          { status: 409 }
        );
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE subcontractors s SET ${setClause}
         FROM service_offices so, accounts a
         WHERE so.service_office_id = s.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $${values.length + 1}
           AND s.subcontractor_id = $${values.length + 2}
         RETURNING s.*`,
        [...values, user.id, subcontractorId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Subcontractor PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { id } = await params;
    const subcontractorId = parseInt(id, 10);
    if (isNaN(subcontractorId)) {
      return NextResponse.json({ error: "Invalid subcontractor ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM subcontractors s
         USING service_offices so, accounts a
         WHERE s.service_office_id = so.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $1
           AND s.subcontractor_id = $2
         RETURNING s.subcontractor_id`,
        [user.id, subcontractorId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Subcontractor DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
