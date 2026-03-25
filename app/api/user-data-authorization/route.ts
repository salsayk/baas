import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

const ENTITY_TYPE_CUSTOMER = 2;
const ENTITY_TYPE_PROJECT = 3;
const ENTITY_TYPE_CONTRACT = 4;
// 100 = assign all future customers for this service office (entity_id = service_office_id)
const ENTITY_TYPE_ALL_FUTURE_CUSTOMERS = 100;
// 101 = assign all future projects for this customer (entity_id = customer_id)
const ENTITY_TYPE_ALL_FUTURE_PROJECTS_CUSTOMER = 101;

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceOfficeUserId = searchParams.get("service_office_user_id");

    if (!serviceOfficeUserId) {
      return NextResponse.json({ error: "service_office_user_id is required" }, { status: 400 });
    }

    const userId = parseInt(serviceOfficeUserId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid service_office_user_id" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const accessCheck = await client.query(
        `SELECT sou.service_office_user_id FROM service_office_users sou
         INNER JOIN service_offices so ON so.service_office_id = sou.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE sou.service_office_user_id = $2`,
        [user.id, userId]
      );
      if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: "User not found or access denied" }, { status: 404 });
      }

      const res = await client.query(
        `SELECT auth_id, user_id, authorized_entity_type, entity_id
         FROM service_office_users_data_authorization
         WHERE user_id = $1
         ORDER BY authorized_entity_type, entity_id`,
        [userId]
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("User data authorization GET error:", err);
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

    const body = await request.json();
    const {
      service_office_user_id: serviceOfficeUserId,
      customers,
      projects,
      contracts,
      assign_all_future_customers: assignAllFutureCustomers,
      all_future_projects_customer_ids: allFutureProjectsCustomerIds,
      service_office_id: serviceOfficeId,
    } = body as {
      service_office_user_id: number;
      customers: number[];
      projects: number[];
      contracts: number[];
      assign_all_future_customers?: boolean;
      all_future_projects_customer_ids?: number[];
      service_office_id?: number;
    };

    if (!serviceOfficeUserId || !Array.isArray(customers) || !Array.isArray(projects) || !Array.isArray(contracts)) {
      return NextResponse.json({ error: "service_office_user_id, customers, projects, contracts arrays are required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const accessCheck = await client.query(
        `SELECT sou.service_office_user_id FROM service_office_users sou
         INNER JOIN service_offices so ON so.service_office_id = sou.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE sou.service_office_user_id = $2`,
        [user.id, serviceOfficeUserId]
      );
      if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: "User not found or access denied" }, { status: 404 });
      }

      await client.query("BEGIN");

      await client.query(`DELETE FROM service_office_users_data_authorization WHERE user_id = $1`, [serviceOfficeUserId]);

      const effectiveAssignAllFutureCustomers = !!assignAllFutureCustomers && !!serviceOfficeId;

      const effectiveCustomers = effectiveAssignAllFutureCustomers ? [] : customers;
      // projects must not include any project whose customer is in allFutureProjectsCustomerIds (frontend sends only type 101 per such customer)
      const effectiveProjects = effectiveAssignAllFutureCustomers ? [] : projects;
      const effectiveContracts = effectiveAssignAllFutureCustomers ? [] : contracts;
      const effectiveAllFutureProjectsCustomerIds = effectiveAssignAllFutureCustomers ? [] : allFutureProjectsCustomerIds;

      const rows: Array<{ type: number; id: number }> = [
        ...effectiveCustomers.map((id) => ({ type: ENTITY_TYPE_CUSTOMER, id })),
        ...effectiveProjects.map((id) => ({ type: ENTITY_TYPE_PROJECT, id })),
        ...effectiveContracts.map((id) => ({ type: ENTITY_TYPE_CONTRACT, id })),
        ...(effectiveAssignAllFutureCustomers && serviceOfficeId
          ? [{ type: ENTITY_TYPE_ALL_FUTURE_CUSTOMERS, id: serviceOfficeId }]
          : []),
        ...(Array.isArray(effectiveAllFutureProjectsCustomerIds)
          ? effectiveAllFutureProjectsCustomerIds.map((id) => ({ type: ENTITY_TYPE_ALL_FUTURE_PROJECTS_CUSTOMER, id }))
          : []),
      ];

      if (rows.length > 0) {
        const values = rows.map((r, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
        const flatValues = rows.flatMap((r) => [serviceOfficeUserId, r.type, r.id]);
        await client.query(
          `INSERT INTO service_office_users_data_authorization (user_id, authorized_entity_type, entity_id)
           VALUES ${values.join(", ")}`,
          flatValues
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("User data authorization POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
