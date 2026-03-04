-- Translations for system lookup table names and descriptions
-- Depends on: system_lookups, system_lookup_values, languages
-- Run: node database/run-sql.mjs database/system_lookups/create-system-lookup-translations-tables.sql

CREATE TABLE IF NOT EXISTS system_lookup_translations (
  lookup_table_id  BIGINT NOT NULL REFERENCES system_lookups(lookup_table_id) ON DELETE CASCADE,
  language_id      BIGINT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  description      VARCHAR(250),
  PRIMARY KEY (lookup_table_id, language_id)
);

CREATE INDEX IF NOT EXISTS idx_system_lookup_translations_language_id ON system_lookup_translations(language_id);

COMMENT ON TABLE system_lookup_translations IS 'Localized names and descriptions for system lookup tables.';

-- Translations for system lookup value names
CREATE TABLE IF NOT EXISTS system_lookup_value_translations (
  system_lookup_value_id BIGINT NOT NULL REFERENCES system_lookup_values(id) ON DELETE CASCADE,
  language_id            BIGINT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  value_name             VARCHAR(100) NOT NULL,
  PRIMARY KEY (system_lookup_value_id, language_id)
);

CREATE INDEX IF NOT EXISTS idx_system_lookup_value_translations_language_id ON system_lookup_value_translations(language_id);

COMMENT ON TABLE system_lookup_value_translations IS 'Localized display names for system lookup values.';
