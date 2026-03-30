-- Align contract_user_fee to allow multiple rows per contract (one per professional grade)
-- Run: node database/run-sql.mjs database/contract_user_fee/alter-contract-user-fee-table-composite-pk.sql

DO $$
BEGIN
  -- Drop current PK on contract_id (created by create-contract-user-fee-table.sql)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contract_user_fee_pkey'
  ) THEN
    ALTER TABLE contract_user_fee DROP CONSTRAINT contract_user_fee_pkey;
  END IF;

  -- Add composite PK on (contract_id, user_professional_grade)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contract_user_fee_contract_grade_pk'
  ) THEN
    ALTER TABLE contract_user_fee
      ADD CONSTRAINT contract_user_fee_contract_grade_pk
      PRIMARY KEY (contract_id, user_professional_grade);
  END IF;
END $$;

