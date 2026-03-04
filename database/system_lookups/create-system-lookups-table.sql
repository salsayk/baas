-- System lookups table: metadata for lookup tables
-- Run once, e.g.: node database/run-sql.mjs database/system_lookups/create-system-lookups-table.sql

CREATE TABLE IF NOT EXISTS system_lookups (
  lookup_table_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lookup_table_name        VARCHAR(100) NOT NULL,
  lookup_table_description VARCHAR(250)
);

CREATE INDEX IF NOT EXISTS idx_system_lookups_name ON system_lookups(lookup_table_name);

COMMENT ON TABLE system_lookups IS 'Registry of lookup table names and descriptions.';
