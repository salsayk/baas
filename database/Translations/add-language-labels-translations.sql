-- Add missing labels to languages_screens_translations (language-labels screen)
-- Run: node database/run-sql.mjs database/Translations/add-language-labels-translations.sql

WITH screens AS (SELECT id FROM languages_screens WHERE screen_name = 'language-labels'),
     langs AS (SELECT id, direction FROM languages WHERE id IN (1, 2)),
     seed(entext, hetext) AS (
       VALUES
         ('Edit translations by language and screen', 'עריכת תרגומים לפי שפה ומסך'),
         ('Select a language and screen to view and edit labels. Changes save on blur.', 'בחר שפה ומסך לצפייה ועריכת תוויות. שינויים נשמרים בעת יציאה מהשדה.')
     )
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.entext, l.id,
       CASE WHEN l.direction = 0 THEN seed.entext ELSE seed.hetext END
FROM screens s
CROSS JOIN langs l
CROSS JOIN seed
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
