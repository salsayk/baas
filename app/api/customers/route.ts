import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateCustomerInput } from "@/database/customer/types";

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceOfficeId = searchParams.get("service_office_id");

    const client = getDbClient();
    await client.connect();
    try {
      let res;
      if (serviceOfficeId) {
        const id = parseInt(serviceOfficeId, 10);
        if (isNaN(id)) {
          return NextResponse.json({ error: "Invalid service_office_id" }, { status: 400 });
        }
        res = await client.query(
          `SELECT c.* FROM customers c
           INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE c.service_office_id = $2
           ORDER BY c.creation_datetime DESC`,
          [user.id, id]
        );
      } else {
        res = await client.query(
          `SELECT c.* FROM customers c
           INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           ORDER BY c.creation_datetime DESC`,
          [user.id]
        );
      }
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Customers GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body: CreateCustomerInput = await request.json();
    if (!body.customer_name?.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!body.email_address?.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
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
        `SELECT c.customer_id
         FROM customers c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.service_office_id = $2
           AND c.status != 3
           AND LOWER(TRIM(c.customer_name)) = LOWER(TRIM($3))
         LIMIT 1`,
        [user.id, body.service_office_id, body.customer_name.trim()]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A customer with this name already exists under the selected service office" },
          { status: 409 }
        );
      }

      const res = await client.query(
        `INSERT INTO customers (
          customer_name, service_office_id, legal_id, mobile_phone, secondary_phone,
          email_address, address_country, address_city, address_street, address_street_number, address_zip_code, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *`,
        [
          body.customer_name.trim(),
          body.service_office_id,
          body.legal_id ?? null,
          body.mobile_phone ?? null,
          body.secondary_phone ?? null,
          body.email_address.trim(),
          body.address_country ?? null,
          body.address_city ?? null,
          body.address_street ?? null,
          body.address_street_number ?? null,
          body.address_zip_code ?? null,
          body.status ?? 1,
        ]
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Customers POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
