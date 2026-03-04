-- Seed Hebrew (language_id=2) translations for system_lookups and system_lookup_values
-- Uses languages_screens_translations when source_text matches; otherwise keeps the base text
-- Run: node database/run-sql.mjs database/system_lookups/seed-hebrew-translations.sql

-- system_lookup_translations: one row per lookup table
INSERT INTO system_lookup_translations (lookup_table_id, language_id, name, description)
SELECT
  sl.lookup_table_id,
  2,
  COALESCE(
    (SELECT translated_text FROM languages_screens_translations WHERE source_text = sl.lookup_table_name AND language_id = 2 LIMIT 1),
    sl.lookup_table_name
  ),
  CASE
    WHEN sl.lookup_table_description IS NULL THEN NULL
    ELSE COALESCE(
      (SELECT translated_text FROM languages_screens_translations WHERE source_text = sl.lookup_table_description AND language_id = 2 LIMIT 1),
      sl.lookup_table_description
    )
  END
FROM system_lookups sl
ON CONFLICT (lookup_table_id, language_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- system_lookup_value_translations: one row per lookup value
INSERT INTO system_lookup_value_translations (system_lookup_value_id, language_id, value_name)
SELECT
  v.id,
  2,
  COALESCE(
    (SELECT translated_text FROM languages_screens_translations WHERE source_text = v.value_name AND language_id = 2 LIMIT 1),
    v.value_name
  )
FROM system_lookup_values v
ON CONFLICT (system_lookup_value_id, language_id) DO UPDATE SET
  value_name = EXCLUDED.value_name;
