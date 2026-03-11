import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { CreateContractInput } from "@/database/contracts/types";

const CONTRACT_TYPES_AMOUNT_DISABLED = [2, 4];

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
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
          `SELECT c.*, cust.customer_name
           FROM contracts c
           INNER JOIN customers cust ON cust.customer_id = c.customer_id AND cust.service_office_id = c.service_office_id
           INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE c.service_office_id = $2
           ORDER BY c.creation_datetime DESC`,
          [user.id, id]
        );
      } else {
        res = await client.query(
          `SELECT c.*, cust.customer_name
           FROM contracts c
           INNER JOIN customers cust ON cust.customer_id = c.customer_id AND cust.service_office_id = c.service_office_id
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
    console.error("Contracts GET error:", err);
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

    const body: CreateContractInput = await request.json();

    if (!body.contract_name?.trim()) {
      return NextResponse.json({ error: "Contract name is required" }, { status: 400 });
    }
    if (!body.service_office_id) {
      return NextResponse.json({ error: "Service office is required" }, { status: 400 });
    }
    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    if (body.contract_type == null || body.contract_type === undefined) {
      return NextResponse.json({ error: "Contract type is required" }, { status: 400 });
    }
    if (body.status == null || body.status === undefined) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }
    if (!body.contract_start_date) {
      return NextResponse.json({ error: "Contract start date is required" }, { status: 400 });
    }
    if (!body.contract_currency?.trim()) {
      return NextResponse.json({ error: "Contract currency is required" }, { status: 400 });
    }
    if (body.pp_proforma_recurrence == null || body.pp_proforma_recurrence === undefined) {
      return NextResponse.json({ error: "PP Proforma recurrence is required" }, { status: 400 });
    }
    if (!body.pp_proforma_occasion?.trim()) {
      return NextResponse.json({ error: "PP Proforma occasion is required" }, { status: 400 });
    }

    const amountDisabled = CONTRACT_TYPES_AMOUNT_DISABLED.includes(body.contract_type);
    let contractAmountValue: number | null = null;

    if (amountDisabled) {
      contractAmountValue = null;
    } else {
      if (body.contract_amount_value == null || body.contract_amount_value === undefined) {
        return NextResponse.json({ error: "Contract amount value is required and must be greater than 0" }, { status: 400 });
      }
      if (typeof body.contract_amount_value !== "number" || body.contract_amount_value <= 0) {
        return NextResponse.json({ error: "Contract amount value must be greater than 0" }, { status: 400 });
      }
      contractAmountValue = body.contract_amount_value;
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

      const insertCols = [
        "contract_name",
        "contract_description",
        "service_office_id",
        "customer_id",
        "contract_type",
        "status",
        "contract_start_date",
        "contract_optional_end_date",
        "contract_amount_value",
        "contract_currency",
        "pp_proforma_recurrence",
        "pp_proforma_occasion",
        "pp_initial_payment_reached_indicator",
        "pp_initial_amount_value",
        "pp_upper_cap_reached_indicator",
        "pp_upper_cap_amount_value",
        "pp_recurrence_initial_payment_reached_indicator",
        "pp_recurrence_initial_amount_value",
        "pp_recurrence_upper_cap_reached_indicator",
        "pp_recurrence_upper_cap_amount_value",
      ];

      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(", ");
      const values = [
        body.contract_name.trim(),
        body.contract_description?.trim() || null,
        body.service_office_id,
        body.customer_id,
        body.contract_type,
        body.status ?? 1,
        body.contract_start_date,
        body.contract_optional_end_date || null,
        contractAmountValue,
        body.contract_currency.trim().slice(0, 3),
        body.pp_proforma_recurrence,
        body.pp_proforma_occasion.trim().slice(0, 10),
        body.pp_initial_payment_reached_indicator ?? 0,
        body.pp_initial_amount_value ?? 0,
        body.pp_upper_cap_reached_indicator ?? 0,
        body.pp_upper_cap_amount_value ?? 0,
        body.pp_recurrence_initial_payment_reached_indicator ?? 0,
        body.pp_recurrence_initial_amount_value ?? 0,
        body.pp_recurrence_upper_cap_reached_indicator ?? 0,
        body.pp_recurrence_upper_cap_amount_value ?? 0,
      ];

      const res = await client.query(
        `INSERT INTO contracts (${insertCols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contracts POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
