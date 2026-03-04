-- Create customers table for PostgreSQL
-- Depends on: service_offices table
-- Run: node database/run-sql.mjs database/customer/create-customers-table.sql

CREATE TABLE IF NOT EXISTS customers (
  customer_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name         VARCHAR(100) NOT NULL,
  service_office_id     BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  legal_id              VARCHAR(100),
  mobile_phone          VARCHAR(20),
  secondary_phone       VARCHAR(20),
  email_address         VARCHAR(255) NOT NULL,
  address_country       VARCHAR(50),
  address_city          VARCHAR(50),
  address_street        VARCHAR(50),
  address_street_number INTEGER,
  address_zip_code      VARCHAR(50),
  status                SMALLINT NOT NULL,
  creation_datetime     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'Customer records linked to service offices.';
COMMENT ON COLUMN customers.customer_name IS 'Customer name (max 100 chars).';
COMMENT ON COLUMN customers.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN customers.legal_id IS 'Legal identifier (e.g. tax ID).';
COMMENT ON COLUMN customers.email_address IS 'Email address (max 255 chars).';
COMMENT ON COLUMN customers.status IS 'Customer status code.';
COMMENT ON COLUMN customers.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN customers.updated_datetime IS 'Last update timestamp.';

CREATE INDEX IF NOT EXISTS idx_customers_service_office_id ON customers(service_office_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email_address ON customers(email_address);

CREATE OR REPLACE FUNCTION update_customers_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customers_updated_datetime ON customers;
CREATE TRIGGER trigger_customers_updated_datetime
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE PROCEDURE update_customers_updated_datetime();
