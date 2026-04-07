-- Replace full unique on subscription_offer_type with partial unique (Active only).
-- Run if you already have uq_subscriptions_offers_offer_type from an older script.
-- Run: node database/run-sql.mjs database/subscriptions_offers/migrate-subscriptions-offers-partial-unique-active.sql

DROP INDEX IF EXISTS uq_subscriptions_offers_offer_type;
DROP INDEX IF EXISTS uq_subscriptions_offers_lookup_type;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_offers_active_offer_type
  ON subscriptions_offers (subscription_offer_type)
  WHERE status = 1;
