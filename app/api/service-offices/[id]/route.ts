import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import type { UpdateServiceOfficeInput } from "@/database/Service_Offices/types";

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
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT so.* FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.service_office_id = $2 AND so.status != 3`,
        [user.id, officeId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office GET error:", err);
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
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const body: UpdateServiceOfficeInput = await request.json();
    const allowedKeys = [
      "service_office_name",
      "service_office_description",
      "subscription_offer_id",
      "country",
      "status",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key] ?? null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    if (typeof updates.service_office_name === "string") {
      updates.service_office_name = updates.service_office_name.trim();
      if (!updates.service_office_name) {
        return NextResponse.json({ error: "Service office name cannot be empty" }, { status: 400 });
      }
    }
    if (updates.subscription_offer_id !== undefined) {
      const sid = Number(updates.subscription_offer_id);
      if (!Number.isInteger(sid) || sid < 1) {
        return NextResponse.json({ error: "Subscription offer is required" }, { status: 400 });
      }
      updates.subscription_offer_id = sid;
    }

    const client = getDbClient();
    await client.connect();
    try {
      await client.query("BEGIN");

      const currentRes = await client.query(
        `SELECT so.account_id, so.service_office_name
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.service_office_id = $2 AND so.status != 3`,
        [user.id, officeId]
      );
      if (currentRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }

      const current = currentRes.rows[0];
      const nextName =
        typeof updates.service_office_name === "string"
          ? updates.service_office_name
          : current.service_office_name;

      const duplicateCheck = await client.query(
        `SELECT so.service_office_id
         FROM service_offices so
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE so.account_id = $2
           AND so.service_office_id <> $3
           AND so.status != 3
           AND LOWER(TRIM(so.service_office_name)) = LOWER(TRIM($4))
         LIMIT 1`,
        [user.id, current.account_id, officeId, nextName]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "A service office with this name already exists under this account" },
          { status: 409 }
        );
      }

      if (updates.subscription_offer_id !== undefined) {
        const offerRes = await client.query(
          `SELECT subscription_offer_id
           FROM subscriptions_offers
           WHERE subscription_offer_id = $1 AND status = 1
           LIMIT 1`,
          [updates.subscription_offer_id]
        );
        if (offerRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Selected subscription offer is invalid or inactive" },
            { status: 400 }
          );
        }

        const activeSubRes = await client.query(
          `SELECT subscription_id, subscription_offer_id
           FROM subscriptions
           WHERE service_office_id = $1 AND status = 1
           ORDER BY subscription_start_datetime DESC, subscription_id DESC
           LIMIT 1`,
          [officeId]
        );

        const activeSub = activeSubRes.rows[0] as
          | { subscription_id: number; subscription_offer_id: number }
          | undefined;
        const nextOfferId = Number(updates.subscription_offer_id);
        const currentOfferId = activeSub ? Number(activeSub.subscription_offer_id) : null;

        if (currentOfferId !== nextOfferId) {
          if (activeSub) {
            await client.query(
              `UPDATE subscriptions
               SET status = 2,
                   subscription_end_datetime = CURRENT_TIMESTAMP,
                   updated_datetime = CURRENT_TIMESTAMP
               WHERE subscription_id = $1`,
              [activeSub.subscription_id]
            );
          }

          await client.query(
            `INSERT INTO subscriptions (
               service_office_id,
               subscription_offer_id,
               status,
               subscription_start_datetime
             ) VALUES ($1, $2, 1, CURRENT_TIMESTAMP)`,
            [officeId, nextOfferId]
          );
        }
      }

      const serviceOfficeUpdates = { ...updates };
      delete serviceOfficeUpdates.subscription_offer_id;
      let updatedOffice;
      if (Object.keys(serviceOfficeUpdates).length > 0) {
        const setClause = Object.keys(serviceOfficeUpdates)
          .map((k, i) => `${k} = $${i + 1}`)
          .join(", ");
        const values = Object.values(serviceOfficeUpdates);
        const res = await client.query(
          `UPDATE service_offices so SET ${setClause}
           FROM accounts a
           WHERE a.account_id = so.account_id AND a.user_id = $${values.length + 1}
           AND so.service_office_id = $${values.length + 2} AND so.status != 3
           RETURNING so.*`,
          [...values, user.id, officeId]
        );
        if (res.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Service office not found" }, { status: 404 });
        }
        updatedOffice = res.rows[0];
      } else {
        const res = await client.query(
          `SELECT so.* FROM service_offices so
           INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
           WHERE so.service_office_id = $2 AND so.status != 3`,
          [user.id, officeId]
        );
        if (res.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Service office not found" }, { status: 404 });
        }
        updatedOffice = res.rows[0];
      }

      await client.query("COMMIT");
      return NextResponse.json(updatedOffice);
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office PATCH error:", err);
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
    const officeId = parseInt(id, 10);
    if (isNaN(officeId)) {
      return NextResponse.json({ error: "Invalid service office ID" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `UPDATE service_offices so SET status = 3
         FROM accounts a
         WHERE a.account_id = so.account_id AND a.user_id = $1
         AND so.service_office_id = $2 AND so.status != 3
         RETURNING so.service_office_id`,
        [user.id, officeId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Service office not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Service office DELETE error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
