-- Add missing 'Add, edit, or remove accounts stored in PostgreSQL' label to languages_screens_translations (accounts screen)
-- Run: node database/run-sql.mjs database/Translations/add-accounts-description-translation.sql

WITH screens AS (SELECT id FROM languages_screens WHERE screen_name = 'accounts'),
     langs AS (SELECT id, direction FROM languages WHERE id IN (1, 2))
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, 'Add, edit, or remove accounts stored in PostgreSQL', l.id,
       CASE WHEN l.direction = 0 THEN 'Add, edit, or remove accounts stored in PostgreSQL' ELSE 'הוסף, ערוך או הסר חשבונות המאוחסנים ב-PostgreSQL' END
FROM screens s
CROSS JOIN langs l
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
