import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateCustomerInput } from "@/database/customer/types";

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
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT c.* FROM customers c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.customer_id = $2`,
        [user.id, customerId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Customer GET error:", err);
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
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const body: UpdateCustomerInput = await request.json();
    const allowedKeys = [
      "customer_name",
      "legal_id",
      "mobile_phone",
      "secondary_phone",
      "email_address",
      "address_country",
      "address_city",
      "address_street",
      "address_street_number",
      "address_zip_code",
      "status",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key] ?? null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    if (typeof updates.customer_name === "string") {
      updates.customer_name = updates.customer_name.trim();
      if (!updates.customer_name) {
        return NextResponse.json({ error: "Customer name cannot be empty" }, { status: 400 });
      }
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT c.service_office_id, c.customer_name
         FROM customers c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.customer_id = $2`,
        [user.id, customerId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }

      const current = currentRes.rows[0];
      const nextName =
        typeof updates.customer_name === "string" ? updates.customer_name : current.customer_name;

      const duplicateCheck = await client.query(
        `SELECT c.customer_id
         FROM customers c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.service_office_id = $2
           AND c.customer_id <> $3
           AND c.status != 3
           AND LOWER(TRIM(c.customer_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, current.service_office_id, customerId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "A customer with this name already exists under this service office" },
          { status: 409 }
        );
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);
      const res = await client.query(
        `UPDATE customers c SET ${setClause}
         FROM service_offices so, accounts a
         WHERE so.service_office_id = c.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $${values.length + 1}
           AND c.customer_id = $${values.length + 2}
         RETURNING c.*`,
        [...values, user.id, customerId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Customer PATCH error:", err);
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
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM customers c
         USING service_offices so, accounts a
         WHERE c.service_office_id = so.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $1
           AND c.customer_id = $2
         RETURNING c.customer_id`,
        [user.id, customerId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Customer DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
