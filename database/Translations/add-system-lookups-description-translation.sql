-- Add missing 'Add, edit, or remove lookup tables and their values' label to languages_screens_translations (system-lookups screen)
-- Run: node database/run-sql.mjs database/Translations/add-system-lookups-description-translation.sql

WITH screens AS (SELECT id FROM languages_screens WHERE screen_name = 'system-lookups'),
     langs AS (SELECT id, direction FROM languages WHERE id IN (1, 2))
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, 'Add, edit, or remove lookup tables and their values', l.id,
       CASE WHEN l.direction = 0 THEN 'Add, edit, or remove lookup tables and their values' ELSE 'הוסף, ערוך או הסר טבלאות חיפוש והערכים שלהן' END
FROM screens s
CROSS JOIN langs l
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
