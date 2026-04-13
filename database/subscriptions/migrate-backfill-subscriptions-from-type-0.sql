-- Backfill subscriptions for existing service offices that do not yet have a subscription.
-- Uses the ACTIVE subscription offer with subscription_offer_type = 0.
-- Run: node database/run-sql.mjs database/subscriptions/migrate-backfill-subscriptions-from-type-0.sql

DO $$
DECLARE
  v_offer_id BIGINT;
BEGIN
  -- Find active offer for type 0. Must be exactly one active row per your partial unique rule.
  SELECT so.subscription_offer_id
  INTO v_offer_id
  FROM subscriptions_offers so
  WHERE so.subscription_offer_type = 0
    AND so.status = 1
  LIMIT 1;

  IF v_offer_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription offer found for subscription_offer_type = 0';
  END IF;

  INSERT INTO subscriptions (
    service_office_id,
    subscription_offer_id,
    status,
    subscription_start_datetime
  )
  SELECT
    so.service_office_id,
    v_offer_id,
    1,
    CURRENT_TIMESTAMP
  FROM service_offices so
  WHERE so.status != 3
    AND NOT EXISTS (
      SELECT 1
      FROM subscriptions s
      WHERE s.service_office_id = so.service_office_id
    );
END $$;

