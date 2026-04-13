-- Add/update translations for service-offices subscription-offer selection
-- Run: node database/run-sql.mjs database/Translations/add-service-offices-subscription-offer-translations.sql

INSERT INTO languages_screens (screen_name)
VALUES ('service-offices')
ON CONFLICT (screen_name) DO NOTHING;

WITH screen AS (
  SELECT id FROM languages_screens WHERE screen_name = 'service-offices'
),
langs AS (
  SELECT id, direction FROM languages WHERE id IN (1, 2)
),
seed(source_text, en_text, he_text) AS (
  VALUES
    ('Subscription offer name', 'Subscription offer name', 'שם הצעת מנוי'),
    ('Select subscription offer', 'Select subscription offer', 'בחר הצעת מנוי'),
    ('Subscription offer is required', 'Subscription offer is required', 'נדרשת הצעת מנוי'),
    ('Selected subscription offer is invalid or inactive', 'Selected subscription offer is invalid or inactive', 'הצעת המנוי שנבחרה אינה תקינה או אינה פעילה')
)
INSERT INTO languages_screens_translations (screen_id, source_text, language_id, translated_text)
SELECT s.id, seed.source_text, l.id,
       CASE WHEN l.direction = 0 THEN seed.en_text ELSE seed.he_text END
FROM seed
CROSS JOIN langs l
CROSS JOIN screen s
ON CONFLICT (screen_id, language_id, source_text) DO UPDATE
SET translated_text = EXCLUDED.translated_text;
