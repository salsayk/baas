-- Migrate existing subscriptions_offers: drop subscription_offer_lookup_table_id, fix updated_datetime semantics.
-- Run after an older create script that included lookup_table_id and updated_datetime DEFAULT.
-- Run: node database/run-sql.mjs database/subscriptions_offers/migrate-remove-lookup-table-id-and-updated-default.sql

ALTER TABLE subscriptions_offers DROP CONSTRAINT IF EXISTS fk_subscriptions_offers_offer_type_value;
ALTER TABLE subscriptions_offers DROP CONSTRAINT IF EXISTS subscriptions_offers_subscription_offer_lookup_table_id_fkey;

DROP INDEX IF EXISTS uq_subscriptions_offers_lookup_type;
DROP INDEX IF EXISTS idx_subscriptions_offers_lookup_type;

ALTER TABLE subscriptions_offers DROP COLUMN IF EXISTS subscription_offer_lookup_table_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_offers_active_offer_type
  ON subscriptions_offers (subscription_offer_type)
  WHERE status = 1;

ALTER TABLE subscriptions_offers
  ALTER COLUMN updated_datetime DROP DEFAULT;

ALTER TABLE subscriptions_offers
  ALTER COLUMN updated_datetime DROP NOT NULL;
