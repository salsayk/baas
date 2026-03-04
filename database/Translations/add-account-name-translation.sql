-- Add missing 'Account Name' label to languages_screens_translations (accounts screen)
-- Run: node database/run-sql.mjs database/Translations/add-account-name-translation.sql

WITH screens AS (SELECT id FROM languages_screens WHERE screen_name = 'accounts'),
     langs AS (SELECT id, direction FROM languages WHERE id IN (1, 2))
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, 'Account Name', l.id,
       CASE WHEN l.direction = 0 THEN 'Account Name' ELSE 'שם חשבון' END
FROM screens s
CROSS JOIN langs l
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
