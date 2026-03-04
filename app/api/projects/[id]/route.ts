import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateProjectInput } from "@/database/project/types";

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
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT p.* FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE p.project_id = $2`,
        [user.id, projectId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Project GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
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
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body: UpdateProjectInput = await request.json();
    const allowedKeys = ["project_name", "project_scope_description", "status"] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (typeof updates.project_name === "string") {
      updates.project_name = updates.project_name.trim();
      if (!updates.project_name) {
        return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
      }
    }
    if (typeof updates.project_scope_description === "string") {
      updates.project_scope_description = updates.project_scope_description.trim();
      if (!updates.project_scope_description) {
        return NextResponse.json({ error: "Project scope description cannot be empty" }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT p.service_office_id, p.customer_id, p.project_name
         FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE p.project_id = $2`,
        [user.id, projectId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const current = currentRes.rows[0];
      const nextName =
        typeof updates.project_name === "string" ? updates.project_name : current.project_name;

      const duplicateCheck = await client.query(
        `SELECT p.project_id
         FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE p.service_office_id = $2
           AND p.customer_id = $3
           AND p.project_id <> $4
           AND p.status != 3
           AND LOWER(TRIM(p.project_name)) = LOWER(TRIM($5))
         LIMIT 1`,
        [user.id, current.service_office_id, current.customer_id, projectId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A project with this name already exists under this service office and customer" },
          { status: 409 }
        );
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);

      const res = await client.query(
        `UPDATE projects p SET ${setClause}
         FROM service_offices so, accounts a
         WHERE so.service_office_id = p.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $${values.length + 1}
           AND p.project_id = $${values.length + 2}
         RETURNING p.*`,
        [...values, user.id, projectId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Project PATCH error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
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
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM projects p
         USING service_offices so, accounts a
         WHERE p.service_office_id = so.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $1
           AND p.project_id = $2
         RETURNING p.project_id`,
        [user.id, projectId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Project DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
