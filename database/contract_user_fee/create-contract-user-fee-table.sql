-- Create table: contract_user_fee
-- Run: node database/run-sql.mjs database/contract_user_fee/create-contract-user-fee-table.sql

CREATE TABLE contract_user_fee (
  contract_id INTEGER PRIMARY KEY,
  user_professional_grade INTEGER NOT NULL,
  user_hourly_rate NUMERIC NOT NULL,
  user_hourly_rate_discount NUMERIC NOT NULL,

  -- Discount is a percentage in [0, 100]
  CONSTRAINT contract_user_fee_discount_range_chk
    CHECK (user_hourly_rate_discount >= 0 AND user_hourly_rate_discount <= 100),

  -- Hourly rate should not be negative
  CONSTRAINT contract_user_fee_hourly_rate_non_negative_chk
    CHECK (user_hourly_rate >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_user_fee_contract_fk'
  ) THEN
    ALTER TABLE contract_user_fee
      ADD CONSTRAINT contract_user_fee_contract_fk
      FOREIGN KEY (contract_id)
      REFERENCES contracts(contract_id)
      ON DELETE CASCADE;
  END IF;
END $$;

