import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateProjectInput } from "@/database/project/types";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceOfficeId = searchParams.get("service_office_id");
    const customerId = searchParams.get("customer_id");

    const client = getDbClient();
    await client.connect();
    try {
      const params: Array<number | string> = [user.id as string];
      const where: string[] = [];

      if (serviceOfficeId) {
        const id = parseInt(serviceOfficeId, 10);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid service_office_id" }, { status: 400 });
        params.push(id);
        where.push(`p.service_office_id = $${params.length}`);
      }

      if (customerId) {
        const id = parseInt(customerId, 10);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid customer_id" }, { status: 400 });
        params.push(id);
        where.push(`p.customer_id = $${params.length}`);
      }

      const whereClause = where.length > 0 ? `AND ${where.join(" AND ")}` : "";
      const res = await client.query(
        `SELECT p.* FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         INNER JOIN customers c ON c.customer_id = p.customer_id AND c.service_office_id = p.service_office_id AND c.status != 3
         WHERE 1=1 ${whereClause}
         ORDER BY p.creation_datetime DESC`,
        params
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Projects GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body: CreateProjectInput = await request.json();
    if (!body.project_name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }
    if (!body.project_scope_description?.trim()) {
      return NextResponse.json({ error: "Project scope description is required" }, { status: 400 });
    }
    if (!body.service_office_id) {
      return NextResponse.json({ error: "Service office is required" }, { status: 400 });
    }
    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const relationCheck = await client.query(
        `SELECT c.customer_id
         FROM customers c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.customer_id = $2 AND c.service_office_id = $3 AND c.status != 3`,
        [user.id, body.customer_id, body.service_office_id]
      );
      if (relationCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Customer not found in the selected service office or access denied" },
          { status: 404 }
        );
      }

      const duplicateCheck = await client.query(
        `SELECT p.project_id
         FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE p.service_office_id = $2
           AND p.customer_id = $3
           AND p.status != 3
           AND LOWER(TRIM(p.project_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, body.service_office_id, body.customer_id, body.project_name.trim()]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A project with this name already exists under the selected service office and customer" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO projects (
          project_name, service_office_id, customer_id, project_scope_description, status
        ) VALUES ($1,$2,$3,$4,$5)
        RETURNING *`,
        [
          body.project_name.trim(),
          body.service_office_id,
          body.customer_id,
          body.project_scope_description.trim(),
          body.status ?? 1,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Projects POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
