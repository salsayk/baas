import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateServiceOfficeUserInput } from "@/database/service_office_users/types";

const SUBCONTRACTOR_USER_TYPE_VALUE_ID = 4;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid service office user ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT u.* FROM service_office_users u
         INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE u.service_office_user_id = $2`,
        [user.id, userId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office user not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office user GET error:", err);
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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid service office user ID" }, { status: 400 });
    }

    const body: UpdateServiceOfficeUserInput = await request.json();
    const allowedKeys = [
      "user_name",
      "user_type",
      "user_professional_grade",
      "subcontractor_id",
      "mobile_phone",
      "secondary_phone",
      "email_address",
      "status",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key] ?? null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (typeof updates.user_name === "string") {
      updates.user_name = updates.user_name.trim();
      if (!updates.user_name) {
        return NextResponse.json({ error: "User name cannot be empty" }, { status: 400 });
      }
    }

    const nextUserType = typeof updates.user_type === "number" ? updates.user_type : undefined;
    const nextSubcontractorId = updates.subcontractor_id;
    if (nextUserType === SUBCONTRACTOR_USER_TYPE_VALUE_ID) {
      const subVal = nextSubcontractorId !== undefined ? nextSubcontractorId : body.subcontractor_id;
      if (!subVal) {
        return NextResponse.json(
          { error: "Subcontractor is required when user type is Subcontractor User" },
          { status: 400 }
        );
      }
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT u.service_office_id, u.user_name, u.user_type, u.subcontractor_id
         FROM service_office_users u
         INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE u.service_office_user_id = $2`,
        [user.id, userId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Service office user not found" }, { status: 404 });
      }
      const current = currentRes.rows[0];
      const effectiveUserType = nextUserType ?? current.user_type;
      const effectiveSubcontractorId =
        nextSubcontractorId !== undefined ? nextSubcontractorId : current.subcontractor_id;
      if (effectiveUserType === SUBCONTRACTOR_USER_TYPE_VALUE_ID && !effectiveSubcontractorId) {
        return NextResponse.json(
          { error: "Subcontractor is required when user type is Subcontractor User" },
          { status: 400 }
        );
      }

      if (effectiveUserType === SUBCONTRACTOR_USER_TYPE_VALUE_ID && effectiveSubcontractorId) {
        const subcontractorCheck = await client.query(
          `SELECT s.subcontractor_id FROM subcontractors s
           INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE s.subcontractor_id = $2 AND s.service_office_id = $3 AND s.status != 3`,
          [user.id, effectiveSubcontractorId, current.service_office_id]
        );
        if (subcontractorCheck.rows.length === 0) {
          return NextResponse.json(
            { error: "Subcontractor not found or does not belong to this service office" },
            { status: 400 }
          );
        }
      }

      const nextName = typeof updates.user_name === "string" ? updates.user_name : current.user_name;
      const duplicateCheck = await client.query(
        `SELECT u.service_office_user_id
         FROM service_office_users u
         INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE u.service_office_id = $2
           AND u.service_office_user_id <> $3
           AND u.status != 3
           AND LOWER(TRIM(u.user_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, current.service_office_id, userId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A user with this name already exists under this service office" },
          { status: 409 }
        );
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE service_office_users u SET ${setClause}
         FROM service_offices so, accounts a
         WHERE so.service_office_id = u.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $${values.length + 1}
           AND u.service_office_user_id = $${values.length + 2}
         RETURNING u.*`,
        [...values, user.id, userId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office user not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office user PATCH error:", err);
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
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid service office user ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM service_office_users u
         USING service_offices so, accounts a
         WHERE u.service_office_id = so.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $1
           AND u.service_office_user_id = $2
         RETURNING u.service_office_user_id`,
        [user.id, userId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office user not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office user DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
