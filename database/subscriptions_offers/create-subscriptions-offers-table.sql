-- Subscriptions offers (subscription plans / pricing offers)
-- subscription_offer_type = system_lookup_values.value_id for lookup_table_id 8 (enforced in app; no FK on value_id alone).
-- Run: node database/run-sql.mjs database/subscriptions_offers/create-subscriptions-offers-table.sql
--
-- UI: offer_currency should use ISO 4217 codes (e.g. shared list with ILS and USD first — see database/contracts/currencies.ts).
-- updated_datetime is NULL on insert and set only on UPDATE (trigger).

CREATE TABLE IF NOT EXISTS subscriptions_offers (
  subscription_offer_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  administrator_restricted_offer   SMALLINT NOT NULL CHECK (administrator_restricted_offer IN (0, 1)),
  subscription_offer_name          VARCHAR(100) NOT NULL,
  subscription_offer_type          BIGINT NOT NULL,
  subscription_offer_monthly_price NUMERIC(18, 2) NOT NULL,
  offer_currency                   VARCHAR(3) NOT NULL,
  status                           SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3)),
  creation_datetime                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime                 TIMESTAMP WITH TIME ZONE NULL
);

COMMENT ON TABLE subscriptions_offers IS 'Subscription pricing offers; type values come from system lookup id 8.';
COMMENT ON COLUMN subscriptions_offers.administrator_restricted_offer IS '0=No, 1=Yes.';
COMMENT ON COLUMN subscriptions_offers.subscription_offer_name IS 'Display name (max 100 characters).';
COMMENT ON COLUMN subscriptions_offers.subscription_offer_type IS 'value_id from system_lookup_values for lookup_table_id 8.';
COMMENT ON COLUMN subscriptions_offers.offer_currency IS 'ISO 4217 alphabetic code (3 characters).';
COMMENT ON COLUMN subscriptions_offers.status IS '1=Active, 2=Inactive, 3=Deleted.';
COMMENT ON COLUMN subscriptions_offers.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN subscriptions_offers.updated_datetime IS 'Last update timestamp; NULL until first UPDATE.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_offers_status ON subscriptions_offers (status);

-- At most one row with status = Active (1) per subscription_offer_type; multiple Inactive/Deleted allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_offers_active_offer_type
  ON subscriptions_offers (subscription_offer_type)
  WHERE status = 1;

CREATE OR REPLACE FUNCTION update_subscriptions_offers_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_offers_updated_datetime ON subscriptions_offers;
CREATE TRIGGER trigger_subscriptions_offers_updated_datetime
  BEFORE UPDATE ON subscriptions_offers
  FOR EACH ROW
  EXECUTE PROCEDURE update_subscriptions_offers_updated_datetime();
