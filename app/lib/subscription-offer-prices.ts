import type pg from "pg";

/** Single offer row with current (open) price joined from subscription_offer_prices. */
export async function fetchSubscriptionOfferWithCurrentPrice(
  client: pg.Client,
  subscriptionOfferId: number
): Promise<Record<string, unknown> | null> {
  const res = await client.query(
    `SELECT so.subscription_offer_id,
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
     WHERE so.subscription_offer_id = $1`,
    [subscriptionOfferId]
  );
  return res.rows[0] ?? null;
}

/**
 * Plain JSON-safe shape for API responses. Avoids non-JSON-serializable or ambiguous pg values
 * so the client always receives stable `subscription_offer_monthly_price` strings.
 */
export function subscriptionOfferRowToJson(row: Record<string, unknown>): Record<string, unknown> {
  const price = row.subscription_offer_monthly_price;
  return {
    subscription_offer_id: Number(row.subscription_offer_id),
    administrator_restricted_offer: Number(row.administrator_restricted_offer ?? 0),
    subscription_offer_name: String(row.subscription_offer_name ?? ""),
    subscription_offer_type: Number(row.subscription_offer_type),
    status: Number(row.status),
    creation_datetime: row.creation_datetime ?? null,
    updated_datetime: row.updated_datetime ?? null,
    subscription_offer_monthly_price:
      price === null || price === undefined ? null : String(price),
    offer_currency:
      row.offer_currency === null || row.offer_currency === undefined
        ? null
        : String(row.offer_currency).toUpperCase().slice(0, 3),
  };
}

function normalizeCurrency(raw: string): string {
  return String(raw).trim().toUpperCase().slice(0, 3);
}

/** Compare two NUMERIC monthly prices (2 decimal places). */
function monthlyPricesEqual(a: unknown, b: number): boolean {
  const x = Number(a);
  if (!Number.isFinite(x) || !Number.isFinite(b)) return false;
  return Math.round(x * 100) === Math.round(b * 100);
}

/**
 * Ensures the active (open) price row for an offer matches `newPrice` / `newCurrency`.
 * If there is no open row, inserts one with `price_start_datetime = now`.
 * If price or currency differs from the current open row, closes that row and inserts a new open row.
 */
export async function applySubscriptionOfferPriceChange(
  client: pg.Client,
  subscriptionOfferId: number,
  newPrice: number,
  rawCurrency: string
): Promise<void> {
  const currency = normalizeCurrency(rawCurrency);
  if (currency.length !== 3) {
    throw new Error("offer_currency must be a 3-character ISO code");
  }

  const cur = await client.query<{
    subscription_offer_price_id: number;
    subscription_offer_monthly_price: string;
    offer_currency: string;
  }>(
    `SELECT subscription_offer_price_id, subscription_offer_monthly_price, offer_currency
     FROM subscription_offer_prices
     WHERE subscription_offer_id = $1 AND price_end_datetime IS NULL
     FOR UPDATE`,
    [subscriptionOfferId]
  );

  if (cur.rows.length === 0) {
    await client.query(
      `INSERT INTO subscription_offer_prices (
         subscription_offer_id, subscription_offer_monthly_price, offer_currency,
         price_start_datetime, price_end_datetime
       ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, NULL)`,
      [subscriptionOfferId, newPrice, currency]
    );
    return;
  }

  const row = cur.rows[0];
  if (
    monthlyPricesEqual(row.subscription_offer_monthly_price, newPrice) &&
    String(row.offer_currency) === currency
  ) {
    return;
  }

  await client.query(
    `UPDATE subscription_offer_prices
     SET price_end_datetime = CURRENT_TIMESTAMP
     WHERE subscription_offer_price_id = $1`,
    [row.subscription_offer_price_id]
  );

  await client.query(
    `INSERT INTO subscription_offer_prices (
       subscription_offer_id, subscription_offer_monthly_price, offer_currency,
       price_start_datetime, price_end_datetime
     ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, NULL)`,
    [subscriptionOfferId, newPrice, currency]
  );
}
