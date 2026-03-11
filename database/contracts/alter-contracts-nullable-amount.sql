-- Allow contract_amount_value to be NULL for contract types 2 and 4
-- Run: node database/run-sql.mjs database/contracts/alter-contracts-nullable-amount.sql

ALTER TABLE contracts ALTER COLUMN contract_amount_value DROP NOT NULL;
