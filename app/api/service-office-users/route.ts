import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateServiceOfficeUserInput } from "@/database/service_office_users/types";

const SUBCONTRACTOR_USER_TYPE_VALUE_ID = 4;

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const serviceOfficeId = searchParams.get("service_office_id");

    const client = getDbClient();
    await client.connect();
    try {
      let res;
      if (serviceOfficeId) {
        const id = parseInt(serviceOfficeId, 10);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid service_office_id" }, { status: 400 });
        res = await client.query(
          `SELECT u.* FROM service_office_users u
           INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE u.service_office_id = $2
           ORDER BY u.creation_datetime DESC`,
          [user.id, id]
        );
      } else {
        res = await client.query(
          `SELECT u.* FROM service_office_users u
           INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           ORDER BY u.creation_datetime DESC`,
          [user.id]
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office users GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body: CreateServiceOfficeUserInput = await request.json();
    if (!body.user_name?.trim()) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 });
    }
    if (body.user_type == null || body.user_type === undefined) {
      return NextResponse.json({ error: "User type is required" }, { status: 400 });
    }
    if (body.user_professional_grade == null || body.user_professional_grade === undefined) {
      return NextResponse.json({ error: "User professional grade is required" }, { status: 400 });
    }
    if (!body.service_office_id) {
      return NextResponse.json({ error: "Service office is required" }, { status: 400 });
    }
    if (!body.mobile_phone?.trim()) {
      return NextResponse.json({ error: "Mobile phone is required" }, { status: 400 });
    }
    if (!body.email_address?.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    if (body.user_type === SUBCONTRACTOR_USER_TYPE_VALUE_ID) {
      if (!body.subcontractor_id) {
        return NextResponse.json(
          { error: "Subcontractor is required when user type is Subcontractor User" },
          { status: 400 }
        );
      }
    }

    const client = getDbClient();
    await client.connect();
    try {
      const officeCheck = await client.query(
        `SELECT so.service_office_id
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.service_office_id = $2 AND so.status != 3`,
        [user.id, body.service_office_id]
      );
      if (officeCheck.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found or access denied" }, { status: 404 });
      }

      if (body.user_type === SUBCONTRACTOR_USER_TYPE_VALUE_ID && body.subcontractor_id) {
        const subcontractorCheck = await client.query(
          `SELECT s.subcontractor_id FROM subcontractors s
           INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE s.subcontractor_id = $2 AND s.service_office_id = $3 AND s.status != 3`,
          [user.id, body.subcontractor_id, body.service_office_id]
        );
        if (subcontractorCheck.rows.length === 0) {
          return NextResponse.json(
            { error: "Subcontractor not found or does not belong to the selected service office" },
            { status: 400 }
          );
        }
      }

      const duplicateCheck = await client.query(
        `SELECT u.service_office_user_id
         FROM service_office_users u
         INNER JOIN service_offices so ON so.service_office_id = u.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE u.service_office_id = $2
           AND u.status != 3
           AND LOWER(TRIM(u.user_name)) = LOWER(TRIM($3))
         LIMIT 1`,
        [user.id, body.service_office_id, body.user_name.trim()]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A user with this name already exists under the selected service office" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO service_office_users (
          user_name, user_type, user_professional_grade, service_office_id, subcontractor_id,
          mobile_phone, secondary_phone, email_address, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          body.user_name.trim(),
          body.user_type,
          body.user_professional_grade,
          body.service_office_id,
          body.subcontractor_id ?? null,
          body.mobile_phone.trim(),
          body.secondary_phone?.trim() || null,
          body.email_address.trim(),
          body.status ?? 1,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office users POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
