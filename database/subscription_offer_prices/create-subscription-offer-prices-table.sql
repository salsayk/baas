-- Subscription offer prices (time-bounded monthly price rows per offer)
-- Depends on: subscriptions_offers
-- Run: node database/run-sql.mjs database/subscription_offer_prices/create-subscription-offer-prices-table.sql
--
-- UI: offer_currency should use ISO 4217 alphabetic codes; dropdown order matches
-- database/contracts/currencies.ts (ILS and USD first).

CREATE TABLE IF NOT EXISTS subscription_offer_prices (
  subscription_offer_price_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_offer_id            BIGINT NOT NULL
    REFERENCES subscriptions_offers (subscription_offer_id) ON DELETE CASCADE,
  subscription_offer_monthly_price NUMERIC(18, 2) NOT NULL,
  offer_currency                   VARCHAR(3) NOT NULL
    CHECK (offer_currency ~ '^[A-Z]{3}$'),
  price_start_datetime             TIMESTAMP WITH TIME ZONE NOT NULL,
  price_end_datetime               TIMESTAMP WITH TIME ZONE NULL DEFAULT NULL,
  CONSTRAINT subscription_offer_prices_end_after_start CHECK (
    price_end_datetime IS NULL OR price_end_datetime >= price_start_datetime
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_offer_prices_offer_id
  ON subscription_offer_prices (subscription_offer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_offer_prices_start
  ON subscription_offer_prices (subscription_offer_id, price_start_datetime);

-- At most one "current" row per offer (open-ended interval).
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_offer_prices_one_open
  ON subscription_offer_prices (subscription_offer_id)
  WHERE price_end_datetime IS NULL;

COMMENT ON TABLE subscription_offer_prices IS 'Historical / scheduled monthly price rows per subscription offer (ISO 4217 currency).';
COMMENT ON COLUMN subscription_offer_prices.subscription_offer_price_id IS 'Surrogate key.';
COMMENT ON COLUMN subscription_offer_prices.subscription_offer_id IS 'Parent subscription offer.';
COMMENT ON COLUMN subscription_offer_prices.subscription_offer_monthly_price IS 'Monthly price amount for this interval.';
COMMENT ON COLUMN subscription_offer_prices.offer_currency IS 'ISO 4217 alphabetic code (3 uppercase letters).';
COMMENT ON COLUMN subscription_offer_prices.price_start_datetime IS 'Interval start (inclusive).';
COMMENT ON COLUMN subscription_offer_prices.price_end_datetime IS 'Interval end (exclusive or inclusive per app rules); NULL = open-ended.';
