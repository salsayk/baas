import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import {
  applySubscriptionOfferPriceChange,
  fetchSubscriptionOfferWithCurrentPrice,
  subscriptionOfferRowToJson,
} from "@/app/lib/subscription-offer-prices";
import { SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT } from "@/database/subscriptions_offers/active-type-conflict-message";
import type { CreateSubscriptionOfferInput } from "@/database/subscriptions_offers/types";

export const dynamic = "force-dynamic";

const LIST_QUERY = `
  SELECT so.subscription_offer_id,
         so.administrator_restricted_offer,
         so.subscription_offer_name,
         so.subscription_offer_type,
         so.status,
         so.creation_datetime,
         so.updated_datetime,
         p.subscription_offer_monthly_price,
         p.offer_currency
  FROM subscriptions_offers so
  LEFT JOIN subscription_offer_prices p
    ON p.subscription_offer_id = so.subscription_offer_id
   AND p.price_end_datetime IS NULL
  ORDER BY so.subscription_offer_id ASC
`;

export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(LIST_QUERY);
      return NextResponse.json(res.rows, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("subscriptions-offers GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body: CreateSubscriptionOfferInput = await request.json();

    if (body.administrator_restricted_offer !== 0 && body.administrator_restricted_offer !== 1) {
      return NextResponse.json(
        { error: "administrator_restricted_offer must be 0 or 1" },
        { status: 400 }
      );
    }
    if (!body.subscription_offer_name?.trim()) {
      return NextResponse.json({ error: "subscription_offer_name is required" }, { status: 400 });
    }
    if (body.subscription_offer_type == null || Number.isNaN(Number(body.subscription_offer_type))) {
      return NextResponse.json({ error: "subscription_offer_type is required" }, { status: 400 });
    }
    if (
      body.subscription_offer_monthly_price == null ||
      typeof body.subscription_offer_monthly_price !== "number" ||
      Number.isNaN(body.subscription_offer_monthly_price)
    ) {
      return NextResponse.json(
        { error: "subscription_offer_monthly_price is required" },
        { status: 400 }
      );
    }
    if (!body.offer_currency || String(body.offer_currency).trim().length !== 3) {
      return NextResponse.json({ error: "offer_currency must be a 3-character ISO code" }, { status: 400 });
    }
    if (![1, 2, 3].includes(Number(body.status))) {
      return NextResponse.json({ error: "status must be 1, 2, or 3" }, { status: 400 });
    }

    const name = body.subscription_offer_name.trim().slice(0, 100);
    const typeVal = Number(body.subscription_offer_type);
    const price = Number(body.subscription_offer_monthly_price);
    const currency = String(body.offer_currency).trim().toUpperCase().slice(0, 3);

    const client = getDbClient();
    await client.connect();
    try {
      if (Number(body.status) === 1) {
        const activeClash = await client.query(
          `SELECT 1 FROM subscriptions_offers
           WHERE subscription_offer_type = $1 AND status = 1
           LIMIT 1`,
          [typeVal]
        );
        if (activeClash.rows.length > 0) {
          return NextResponse.json({ error: SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT }, { status: 409 });
        }
      }

      await client.query("BEGIN");

      const res = await client.query(
        `INSERT INTO subscriptions_offers (
           administrator_restricted_offer,
           subscription_offer_name,
           subscription_offer_type,
           status
         ) VALUES ($1, $2, $3, $4)
         RETURNING subscription_offer_id`,
        [body.administrator_restricted_offer, name, typeVal, Number(body.status)]
      );

      const newId = Number(res.rows[0].subscription_offer_id);
      await applySubscriptionOfferPriceChange(client, newId, price, currency);

      const merged = await fetchSubscriptionOfferWithCurrentPrice(client, newId);
      await client.query("COMMIT");
      if (!merged) {
        return NextResponse.json({ error: "Subscription offer not found after create" }, { status: 500 });
      }
      return NextResponse.json(subscriptionOfferRowToJson(merged as Record<string, unknown>), { status: 201 });
    } catch (err: unknown) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        return NextResponse.json({ error: SUBSCRIPTIONS_OFFER_ACTIVE_TYPE_CONFLICT }, { status: 409 });
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("subscriptions-offers POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
