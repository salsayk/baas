-- Create subscriptions table for PostgreSQL
-- Depends on: service_offices table, subscriptions_offers table
-- Run: node database/run-sql.mjs database/subscriptions/create-subscriptions-table.sql
-- updated_datetime is NULL on insert and set only on UPDATE (trigger).

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_office_id             BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  subscription_offer_id         BIGINT NOT NULL REFERENCES subscriptions_offers(subscription_offer_id) ON DELETE RESTRICT,
  status                        SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3)),
  subscription_start_datetime   TIMESTAMP WITH TIME ZONE NOT NULL,
  subscription_end_datetime     TIMESTAMP WITH TIME ZONE NULL,
  creation_datetime             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_datetime              TIMESTAMP WITH TIME ZONE NULL
);

COMMENT ON TABLE subscriptions IS 'Subscriptions linked to service offices and subscription offers.';
COMMENT ON COLUMN subscriptions.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN subscriptions.subscription_offer_id IS 'Reference to subscription offer.';
COMMENT ON COLUMN subscriptions.status IS '1=Active, 2=Inactive, 3=Deleted.';
COMMENT ON COLUMN subscriptions.subscription_start_datetime IS 'Subscription start datetime.';
COMMENT ON COLUMN subscriptions.subscription_end_datetime IS 'Subscription end datetime; NULL means open-ended.';
COMMENT ON COLUMN subscriptions.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN subscriptions.updated_datetime IS 'Last update timestamp; NULL until first UPDATE.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_service_office_id ON subscriptions(service_office_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_offer_id ON subscriptions(subscription_offer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_datetime ON subscriptions(subscription_start_datetime);

CREATE OR REPLACE FUNCTION update_subscriptions_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_datetime ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_datetime
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE update_subscriptions_updated_datetime();
