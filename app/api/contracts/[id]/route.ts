import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateContractInput } from "@/database/contracts/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CONTRACT_TYPES_AMOUNT_DISABLED = [2, 4];

const PP_RECURRENCE_CAP_KEYS = [
  "pp_recurrence_initial_payment_reached_indicator",
  "pp_recurrence_initial_amount_value",
  "pp_recurrence_upper_cap_reached_indicator",
  "pp_recurrence_upper_cap_amount_value",
] as const;

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const body: UpdateContractInput = await request.json();
    const allowedKeys = [
      "contract_name",
      "contract_description",
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
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (typeof updates.contract_name === "string") {
      updates.contract_name = updates.contract_name.trim();
      if (!updates.contract_name) {
        return NextResponse.json({ error: "Contract name cannot be empty" }, { status: 400 });
      }
    }

    const contractType = updates.contract_type;
    if (contractType !== undefined) {
      const amountDisabled = CONTRACT_TYPES_AMOUNT_DISABLED.includes(Number(contractType));
      if (amountDisabled) {
        updates.contract_amount_value = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const currentRes = await client.query(
        `SELECT c.contract_id, c.service_office_id, c.contract_type,
                c.pp_recurrence_initial_payment_reached_indicator,
                c.pp_recurrence_initial_amount_value,
                c.pp_recurrence_upper_cap_reached_indicator,
                c.pp_recurrence_upper_cap_amount_value
         FROM contracts c
         INNER JOIN service_offices so ON so.service_office_id = c.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE c.contract_id = $2`,
        [user.id, contractId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }

      const current = currentRes.rows[0] as Record<string, unknown>;
      const previousContractType = Number(current.contract_type);
      const effectiveContractType =
        updates.contract_type !== undefined ? Number(updates.contract_type) : previousContractType;
      const previousStatus = Number(current.status ?? 1);
      const effectiveStatus = updates.status !== undefined ? Number(updates.status) : previousStatus;
      const requiresPp = [2, 3].includes(effectiveContractType);
      const switchingToHourlyFromType3 = previousContractType === 3 && effectiveContractType === 2;

      // Type 3 (including 2→3): recurrence cap block is not used; always persist zeros.
      if (requiresPp && effectiveContractType === 3) {
        updates.pp_recurrence_initial_payment_reached_indicator = 0;
        updates.pp_recurrence_initial_amount_value = 0;
        updates.pp_recurrence_upper_cap_reached_indicator = 0;
        updates.pp_recurrence_upper_cap_amount_value = 0;
      }

      // Type 2: must have complete recurrence cap data; 3→2 must send all four in this request
      // (UI collects them when switching to hourly; avoids leaving type-3 zeros on an hourly contract).
      if (requiresPp && effectiveContractType === 2) {
        if (switchingToHourlyFromType3) {
          for (const key of PP_RECURRENCE_CAP_KEYS) {
            if (body[key] === undefined) {
              return NextResponse.json(
                {
                  error:
                    "When changing contract type from type 3 to hourly (type 2), all PP recurrence cap fields must be sent in the request",
                },
                { status: 400 }
              );
            }
          }
        }

        const merged = {
          pp_recurrence_initial_payment_reached_indicator:
            updates.pp_recurrence_initial_payment_reached_indicator !== undefined
              ? updates.pp_recurrence_initial_payment_reached_indicator
              : current.pp_recurrence_initial_payment_reached_indicator,
          pp_recurrence_initial_amount_value:
            updates.pp_recurrence_initial_amount_value !== undefined
              ? updates.pp_recurrence_initial_amount_value
              : current.pp_recurrence_initial_amount_value,
          pp_recurrence_upper_cap_reached_indicator:
            updates.pp_recurrence_upper_cap_reached_indicator !== undefined
              ? updates.pp_recurrence_upper_cap_reached_indicator
              : current.pp_recurrence_upper_cap_reached_indicator,
          pp_recurrence_upper_cap_amount_value:
            updates.pp_recurrence_upper_cap_amount_value !== undefined
              ? updates.pp_recurrence_upper_cap_amount_value
              : current.pp_recurrence_upper_cap_amount_value,
        };
        if (
          merged.pp_recurrence_initial_payment_reached_indicator == null ||
          merged.pp_recurrence_initial_amount_value == null ||
          merged.pp_recurrence_upper_cap_reached_indicator == null ||
          merged.pp_recurrence_upper_cap_amount_value == null
        ) {
          return NextResponse.json(
            { error: "PP recurrence cap fields are required for hourly (contract type 2) contracts" },
            { status: 400 }
          );
        }
      }

      // Business rule: hourly contracts (type 2) cannot be saved as Active unless
      // at least one contract_user_fee row exists.
      if (effectiveContractType === 2 && effectiveStatus === 1) {
        const feeRes = await client.query(
          `SELECT 1
           FROM contract_user_fee
           WHERE contract_id = $1
           LIMIT 1`,
          [contractId]
        );
        if (feeRes.rows.length === 0) {
          return NextResponse.json(
            { error: "At least one Contract user fee record is required before saving this contract" },
            { status: 400 }
          );
        }
      }

      const setClause = Object.keys(updates)
        .map((k, i) => `${k} = $${i + 1}`)
        .join(", ");
      const values = Object.values(updates);

      const res = await client.query(
        `UPDATE contracts c SET ${setClause}
         FROM service_offices so, accounts a
         WHERE so.service_office_id = c.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $${values.length + 1}
           AND c.contract_id = $${values.length + 2}
         RETURNING c.*`,
        [...values, user.id, contractId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }
      const updated = res.rows[0];
      const custRes = await client.query(
        `SELECT customer_name FROM customers WHERE customer_id = $1 AND service_office_id = $2`,
        [updated.customer_id, updated.service_office_id]
      );
      const row = { ...updated, customer_name: custRes.rows[0]?.customer_name ?? null };
      return NextResponse.json(row);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract PATCH error:", err);
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
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM contracts c
         USING service_offices so, accounts a
         WHERE c.service_office_id = so.service_office_id
           AND a.account_id = so.account_id
           AND a.user_id = $1
           AND c.contract_id = $2
         RETURNING c.contract_id`,
        [user.id, contractId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Contract DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
