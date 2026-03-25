-- Extend pp_proforma_occasion from VARCHAR(10) to VARCHAR(20)
-- Run: node database/run-sql.mjs database/contracts/alter-contracts-pp-proforma-occasion-length.sql

ALTER TABLE contracts ALTER COLUMN pp_proforma_occasion TYPE VARCHAR(20);
