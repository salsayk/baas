import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import { SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT } from "@/database/subscriptions_offers/active-type-conflict-message";
import type { UpdateSubscriptionOfferInput } from "@/database/subscriptions_offers/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id } = await params;
    const subscriptionOfferId = parseInt(id, 10);
    if (!Number.isFinite(subscriptionOfferId) || subscriptionOfferId < 1) {
      return NextResponse.json({ error: "Invalid subscription offer id" }, { status: 400 });
    }

    const body: UpdateSubscriptionOfferInput = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.administrator_restricted_offer !== undefined) {
      if (body.administrator_restricted_offer !== 0 && body.administrator_restricted_offer !== 1) {
        return NextResponse.json(
          { error: "administrator_restricted_offer must be 0 or 1" },
          { status: 400 }
        );
      }
      updates.administrator_restricted_offer = body.administrator_restricted_offer;
    }
    if (body.subscription_offer_name !== undefined) {
      const n = String(body.subscription_offer_name).trim();
      if (!n) {
        return NextResponse.json({ error: "subscription_offer_name cannot be empty" }, { status: 400 });
      }
      updates.subscription_offer_name = n.slice(0, 100);
    }
    if (body.subscription_offer_type !== undefined) {
      if (body.subscription_offer_type == null || Number.isNaN(Number(body.subscription_offer_type))) {
        return NextResponse.json({ error: "subscription_offer_type is invalid" }, { status: 400 });
      }
      updates.subscription_offer_type = Number(body.subscription_offer_type);
    }
    if (body.subscription_offer_monthly_price !== undefined) {
      if (typeof body.subscription_offer_monthly_price !== "number" || Number.isNaN(body.subscription_offer_monthly_price)) {
        return NextResponse.json({ error: "subscription_offer_monthly_price is invalid" }, { status: 400 });
      }
      updates.subscription_offer_monthly_price = body.subscription_offer_monthly_price;
    }
    if (body.offer_currency !== undefined) {
      const c = String(body.offer_currency).trim().toUpperCase().slice(0, 3);
      if (c.length !== 3) {
        return NextResponse.json({ error: "offer_currency must be a 3-character ISO code" }, { status: 400 });
      }
      updates.offer_currency = c;
    }
    if (body.status !== undefined) {
      if (![1, 2, 3].includes(Number(body.status))) {
        return NextResponse.json({ error: "status must be 1, 2, or 3" }, { status: 400 });
      }
      updates.status = Number(body.status);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const curRes = await client.query(
        `SELECT subscription_offer_type, status FROM subscriptions_offers WHERE subscription_offer_id = $1`,
        [subscriptionOfferId]
      );
      if (curRes.rows.length === 0) {
        return NextResponse.json({ error: "Subscription offer not found" }, { status: 404 });
      }
      const current = curRes.rows[0] as { subscription_offer_type: number; status: number };
      const effectiveType =
        updates.subscription_offer_type !== undefined
          ? Number(updates.subscription_offer_type)
          : Number(current.subscription_offer_type);
      const effectiveStatus =
        updates.status !== undefined ? Number(updates.status) : Number(current.status);

      if (effectiveStatus === 1) {
        const activeClash = await client.query(
          `SELECT 1 FROM subscriptions_offers
           WHERE subscription_offer_type = $1 AND status = 1 AND subscription_offer_id <> $2
           LIMIT 1`,
          [effectiveType, subscriptionOfferId]
        );
        if (activeClash.rows.length > 0) {
          return NextResponse.json({ error: SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT }, { status: 409 });
        }
      }

      const keys = Object.keys(updates);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map((k) => updates[k]);
      const res = await client.query(
        `UPDATE subscriptions_offers SET ${setClause}
         WHERE subscription_offer_id = $${values.length + 1}
         RETURNING *`,
        [...values, subscriptionOfferId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Subscription offer not found" }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        return NextResponse.json({ error: SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT }, { status: 409 });
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("subscriptions-offers PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
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
    const subscriptionOfferId = parseInt(id, 10);
    if (!Number.isFinite(subscriptionOfferId) || subscriptionOfferId < 1) {
      return NextResponse.json({ error: "Invalid subscription offer id" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM subscriptions_offers WHERE subscription_offer_id = $1 RETURNING subscription_offer_id`,
        [subscriptionOfferId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Subscription offer not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("subscriptions-offers DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
