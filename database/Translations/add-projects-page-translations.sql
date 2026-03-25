-- Add Projects page translations (title, subtitle, Scope Description column)
-- Run: node database/run-sql.mjs database/Translations/add-projects-page-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('projects')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'projects'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Loading projects...', 'Loading projects...', 'טוען פרויקטים...')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'customers'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Scope Description', 'Scope Description', 'תיאור היקף'),
    ('By service office and customer', 'By service office and customer', 'לפי משרד שירות ולקוח'),
    ('Select service office and customer to manage projects', 'Select service office and customer to manage projects', 'בחר משרד שירות ולקוח לניהול פרויקטים')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
