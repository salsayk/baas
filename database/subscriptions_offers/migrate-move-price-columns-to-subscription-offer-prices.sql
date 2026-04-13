-- Move subscription_offer_monthly_price + offer_currency from subscriptions_offers → subscription_offer_prices.
-- Prerequisite: subscription_offer_prices table exists (see database/subscription_offer_prices/create-subscription-offer-prices-table.sql).
-- Run: node database/run-sql.mjs database/subscriptions_offers/migrate-move-price-columns-to-subscription-offer-prices.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_offer_prices_one_open
  ON subscription_offer_prices (subscription_offer_id)
  WHERE price_end_datetime IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions_offers'
      AND column_name = 'subscription_offer_monthly_price'
  ) THEN
    INSERT INTO subscription_offer_prices (
      subscription_offer_id,
      subscription_offer_monthly_price,
      offer_currency,
      price_start_datetime,
      price_end_datetime
    )
    SELECT
      so.subscription_offer_id,
      so.subscription_offer_monthly_price,
      upper(trim(so.offer_currency::text)),
      COALESCE(so.creation_datetime, CURRENT_TIMESTAMP),
      NULL
    FROM subscriptions_offers so
    WHERE NOT EXISTS (
      SELECT 1
      FROM subscription_offer_prices p
      WHERE p.subscription_offer_id = so.subscription_offer_id
        AND p.price_end_datetime IS NULL
    );

    ALTER TABLE subscriptions_offers DROP COLUMN subscription_offer_monthly_price;
    ALTER TABLE subscriptions_offers DROP COLUMN offer_currency;
  END IF;
END $$;

COMMIT;
