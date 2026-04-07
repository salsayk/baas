-- At most one Active (status=1) row per subscription_offer_type.
-- Run: node database/run-sql.mjs database/subscriptions_offers/add-unique-subscription-offer-type.sql

DROP INDEX IF EXISTS uq_subscriptions_offers_offer_type;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_offers_active_offer_type
  ON subscriptions_offers (subscription_offer_type)
  WHERE status = 1;
