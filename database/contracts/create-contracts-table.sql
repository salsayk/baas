-- Create contracts table for PostgreSQL
-- Depends on: service_offices table, customers table
-- Run: node database/run-sql.mjs database/contracts/create-contracts-table.sql

CREATE TABLE IF NOT EXISTS contracts (
  contract_id                                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_name                                  VARCHAR(100) NOT NULL,
  contract_description                           VARCHAR(200),
  service_office_id                              BIGINT NOT NULL REFERENCES service_offices(service_office_id) ON DELETE CASCADE,
  customer_id                                    BIGINT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  contract_type                                  SMALLINT NOT NULL,
  status                                         SMALLINT NOT NULL,
  creation_datetime                              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_datetime                               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  contract_start_date                            DATE NOT NULL,
  contract_optional_end_date                     DATE,
  contract_amount_value                          NUMERIC(18,2) NOT NULL,
  contract_currency                              VARCHAR(3) NOT NULL,
  pp_proforma_recurrence                         SMALLINT NOT NULL,
  pp_proforma_occasion                           VARCHAR(10) NOT NULL,
  pp_initial_payment_reached_indicator           SMALLINT NOT NULL,
  pp_initial_amount_value                        NUMERIC(18,2) NOT NULL,
  pp_upper_cap_reached_indicator                 SMALLINT NOT NULL,
  pp_upper_cap_amount_value                      NUMERIC(18,2) NOT NULL,
  pp_recurrence_initial_payment_reached_indicator SMALLINT NOT NULL,
  pp_recurrence_initial_amount_value             NUMERIC(18,2) NOT NULL,
  pp_recurrence_upper_cap_reached_indicator      SMALLINT NOT NULL,
  pp_recurrence_upper_cap_amount_value           NUMERIC(18,2) NOT NULL
);

COMMENT ON TABLE contracts IS 'Contract records linked to service offices and customers.';
COMMENT ON COLUMN contracts.contract_name IS 'Contract name (max 100 chars).';
COMMENT ON COLUMN contracts.contract_description IS 'Contract description (max 200 chars).';
COMMENT ON COLUMN contracts.service_office_id IS 'Reference to service office.';
COMMENT ON COLUMN contracts.customer_id IS 'Reference to customer.';
COMMENT ON COLUMN contracts.contract_type IS 'Contract type code.';
COMMENT ON COLUMN contracts.status IS 'Contract status code.';
COMMENT ON COLUMN contracts.creation_datetime IS 'Record creation timestamp.';
COMMENT ON COLUMN contracts.updated_datetime IS 'Last update timestamp.';
COMMENT ON COLUMN contracts.contract_start_date IS 'Contract start date.';
COMMENT ON COLUMN contracts.contract_optional_end_date IS 'Optional contract end date.';
COMMENT ON COLUMN contracts.contract_amount_value IS 'Contract amount value.';
COMMENT ON COLUMN contracts.contract_currency IS 'Contract currency code (3 chars).';

CREATE INDEX IF NOT EXISTS idx_contracts_service_office_id ON contracts(service_office_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);

CREATE OR REPLACE FUNCTION update_contracts_updated_datetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_datetime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contracts_updated_datetime ON contracts;
CREATE TRIGGER trigger_contracts_updated_datetime
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE PROCEDURE update_contracts_updated_datetime();
