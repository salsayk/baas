import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateSubcontractorInput } from "@/database/subcontractors/types";

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
          `SELECT s.* FROM subcontractors s
           INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE s.service_office_id = $2
           ORDER BY s.creation_datetime DESC`,
          [user.id, id]
        );
      } else {
        res = await client.query(
          `SELECT s.* FROM subcontractors s
           INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           ORDER BY s.creation_datetime DESC`,
          [user.id]
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Subcontractors GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body: CreateSubcontractorInput = await request.json();
    if (!body.subcontractor_name?.trim()) {
      return NextResponse.json({ error: "Subcontractor name is required" }, { status: 400 });
    }
    if (!body.service_office_id) {
      return NextResponse.json({ error: "Service office is required" }, { status: 400 });
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

      const duplicateCheck = await client.query(
        `SELECT s.subcontractor_id
         FROM subcontractors s
         INNER JOIN service_offices so ON so.service_office_id = s.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE s.service_office_id = $2
           AND s.status != 3
           AND LOWER(TRIM(s.subcontractor_name)) = LOWER(TRIM($3))
         LIMIT 1`,
        [user.id, body.service_office_id, body.subcontractor_name.trim()]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A subcontractor with this name already exists under the selected service office" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO subcontractors (
          subcontractor_name, service_office_id, status,
          contact_person_name, contact_person_phone, contact_person_email, contact_person_address
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          body.subcontractor_name.trim(),
          body.service_office_id,
          body.status ?? 1,
          body.contact_person_name ?? null,
          body.contact_person_phone ?? null,
          body.contact_person_email ?? null,
          body.contact_person_address ?? null,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Subcontractors POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
