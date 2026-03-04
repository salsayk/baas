-- System lookup values: rows for each lookup table
-- Run once, e.g.: node database/run-sql.mjs database/system_lookup_values/create-system-lookup-values-table.sql

CREATE TABLE IF NOT EXISTS system_lookup_values (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lookup_table_id BIGINT NOT NULL REFERENCES system_lookups(lookup_table_id) ON DELETE CASCADE,
  value_id        BIGINT NOT NULL CHECK (value_id >= 0),
  value_name      VARCHAR(100) NOT NULL,
  UNIQUE (lookup_table_id, value_id)
);

CREATE INDEX IF NOT EXISTS idx_system_lookup_values_lookup_table_id ON system_lookup_values(lookup_table_id);

COMMENT ON TABLE system_lookup_values IS 'Values for each system lookup table; value_id is unique per lookup_table_id and must be >= 0.';

-- If the table already existed without the minimum check, run once:
-- ALTER TABLE system_lookup_values ADD CONSTRAINT chk_system_lookup_values_value_id_min CHECK (value_id >= 0);
